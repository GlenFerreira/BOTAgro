import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { detectCommodityIntent, getCommodityData } from './modulos/USDA/commodityHandler.js';
import { detectWeatherIntent, getWeatherForecast } from './modulos/openweather/weatherHandler.js';
import { normalizarTextoComIA } from './modulos/utils/textNormalizer.js';
import weatherService from './modulos/openweather/weatherService.js';
import psdService from './modulos/USDA/psdService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config();

// Verifica se as chaves estão configuradas (apenas avisa, não bloqueia para APIs funcionarem)
if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ Aviso: OPENAI_API_KEY não encontrada. Funcionalidades de IA podem não funcionar.');
}

if (!process.env.WHATSAPP_TOKEN) {
    console.warn('⚠️ Aviso: WHATSAPP_TOKEN não encontrada. Webhook do WhatsApp não funcionará.');
    console.warn('📝 As APIs REST continuarão funcionando normalmente.');
}

// Verifica se o token não está vazio ou apenas espaços (se existir)
let token = '';
if (process.env.WHATSAPP_TOKEN) {
    token = process.env.WHATSAPP_TOKEN.trim();
    if (!token || token.length < 10) {
        console.warn('⚠️ Aviso: WHATSAPP_TOKEN parece estar vazio ou inválido');
    }
}

if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('⚠️ Aviso: WHATSAPP_PHONE_NUMBER_ID não encontrada. Webhook do WhatsApp não funcionará.');
}

// Inicializa o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Configurações do bot
// Limpar e validar o token do WhatsApp
let whatsappToken = process.env.WHATSAPP_TOKEN;
if (whatsappToken) {
    // Remove espaços, quebras de linha e caracteres invisíveis
    whatsappToken = whatsappToken.trim().replace(/\s+/g, '').replace(/\r?\n/g, '');
    
    // Validação básica do formato do token
    if (!whatsappToken.startsWith('EA') || whatsappToken.length < 200) {
        console.error('⚠️ Aviso: O token do WhatsApp pode estar em formato incorreto');
        console.error(`   Token começa com: ${whatsappToken.substring(0, 5)}...`);
        console.error(`   Tamanho: ${whatsappToken.length} caracteres`);
    }
} else {
    whatsappToken = '';
}

const config = {
    botName: process.env.BOT_NAME || 'Assistente',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
    whatsappToken: whatsappToken,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.VERIFY_TOKEN || 'meu_token_secreto_123',
    webhookUrl: process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`,
    port: parseInt(process.env.PORT) || 3000,
};

// URL base da API do WhatsApp (apenas se configurado)
const WHATSAPP_API_URL = config.phoneNumberId 
    ? `https://graph.facebook.com/v22.0/${config.phoneNumberId}`
    : null;

// Função para gerar o contexto do sistema do bot
function getSystemContext() {
    return `Você é o ${config.botName}, um assistente virtual especializado em dados agrícolas e commodities.

IDENTIDADE:
- Nome: ${config.botName}
- Especialidade: Análise de dados agrícolas, commodities e mercado agropecuário
- Personalidade: Profissional, amigável, prestativo e acessível
- Tom: Educado, claro e objetivo, mas também caloroso e humano

CAPACIDADES:
- Você tem acesso à API USDA PSD (Production, Supply and Distribution) para fornecer dados atualizados sobre commodities agrícolas
- Pode responder perguntas sobre: milho, soja, trigo, café, algodão, açúcar, arroz e outras commodities
- Quando perguntado sobre dados de commodities, você busca informações reais e atualizadas da API
- Você também pode responder perguntas gerais sobre agricultura, mercado agrícola e commodities

FORMATO DE RESPOSTAS:
- Seja conciso e direto (conversas via WhatsApp são breves)
- Use emojis de forma moderada e profissional quando apropriado
- Sempre responda em português brasileiro
- Se não souber algo, seja honesto e sugira onde o usuário pode encontrar a informação
- Quando mencionar dados de commodities, sempre cite a fonte (USDA PSD Database)

COMPORTAMENTO:
- Seja prestativo e proativo
- Se o usuário perguntar sobre dados de commodities que você não tem acesso, explique que pode buscar dados atualizados
- Mantenha um tom profissional mas acessível
- Adapte o nível técnico da resposta ao contexto da pergunta
- Seja empático e compreensivo

IMPORTANTE:
- Nunca invente dados ou estatísticas
- Se não tiver certeza sobre algo, seja transparente
- Sempre priorize informações precisas e atualizadas`;
}

// Inicializa Express
const app = express();
app.use(express.json());

// Middleware para log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint para verificação do webhook (GET) - apenas se WhatsApp estiver configurado
app.get('/webhook', (req, res) => {
    if (!config.phoneNumberId || !config.whatsappToken) {
        return res.status(503).json({ 
            error: 'WhatsApp não configurado',
            message: 'As APIs REST estão disponíveis, mas o webhook do WhatsApp requer configuração.'
        });
    }

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.verifyToken) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Endpoint para receber mensagens (POST) - apenas se WhatsApp estiver configurado
app.post('/webhook', async (req, res) => {
    if (!config.phoneNumberId || !config.whatsappToken) {
        return res.status(503).json({ 
            error: 'WhatsApp não configurado',
            message: 'As APIs REST estão disponíveis, mas o webhook do WhatsApp requer configuração.'
        });
    }

    try {
        const body = req.body;

        // Responde imediatamente ao WhatsApp (requisito da API)
        res.status(200).send('OK');

        // Verifica se é uma mensagem válida
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            // Processa mensagens recebidas
            if (value?.messages) {
                for (const message of value.messages) {
                    await processarMensagem(message, value.contacts?.[0]);
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error.message);
    }
});

// Função para processar mensagens recebidas
async function processarMensagem(message, contact) {
    try {
        // Ignora mensagens próprias ou de sistema
        if (message.from === config.phoneNumberId) {
            return;
        }

        const from = message.from;
        const messageType = message.type;
        const contactName = contact?.profile?.name || from;

        // Processa apenas mensagens de texto
        if (messageType !== 'text') {
            return;
        }

        const messageBody = message.text?.body || '';
        
        if (!messageBody.trim()) {
            return;
        }

        // Log: Usuário e pergunta
        console.log(`\n👤 ${contactName}: ${messageBody}`);

        let resposta;

        // Verifica se é uma saudação inicial
        if (detectarSaudacao(messageBody)) {
            resposta = gerarApresentacao(config.botName);
            await enviarMensagem(from, resposta);
            console.log(`🤖 Bot: [Apresentação enviada]`);
            return;
        }

        // Verifica se é uma pergunta sobre dados de commodities
        if (detectCommodityIntent(messageBody)) {
            resposta = await getCommodityData(messageBody);
            
            // Se não conseguir dados da API, usa IA como fallback
            if (!resposta || resposta.includes('❌')) {
                resposta = await gerarRespostaIA(messageBody, contactName);
            }
            
            await enviarMensagem(from, resposta);
        }
        // Verifica se é uma pergunta sobre clima
        else if (detectWeatherIntent(messageBody)) {
            const weatherResponse = await getWeatherForecast(messageBody);
            
            // Se não conseguir dados da API, usa IA como fallback
            if (!weatherResponse || (typeof weatherResponse === 'string' && weatherResponse.includes('❌'))) {
                resposta = await gerarRespostaIA(messageBody, contactName);
                await enviarMensagem(from, resposta);
            } else {
                // Verifica se a resposta tem imagem
                if (typeof weatherResponse === 'object' && weatherResponse.imagePath) {
                    await enviarImagem(from, weatherResponse.imagePath);
                    await enviarMensagem(from, weatherResponse.message);
                    resposta = weatherResponse.message;
                } else {
                    await enviarMensagem(from, weatherResponse);
                    resposta = weatherResponse;
                }
            }
        } else {
            // Gera resposta usando IA para outras perguntas
            resposta = await gerarRespostaIA(messageBody, contactName);
            await enviarMensagem(from, resposta);
        }

        // Log: Resposta do bot (primeiras 100 caracteres se for muito longa)
        const respostaPreview = resposta.length > 100 
            ? resposta.substring(0, 100) + '...' 
            : resposta;
        console.log(`🤖 Bot: ${respostaPreview}`);

    } catch (error) {
        console.error(`❌ Erro ao processar mensagem: ${error.message}`);
        
        // Tenta enviar mensagem de erro
        try {
            await enviarMensagem(message.from, 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.');
        } catch (err) {
            // Silencioso em caso de erro ao enviar mensagem de erro
        }
    }
}

// Função para detectar saudação inicial
function detectarSaudacao(mensagem) {
    const saudacoes = [
        'oi', 'olá', 'ola', 'eae', 'e aí', 'eai', 'opa', 'hey', 'hi', 'hello',
        'bom dia', 'boa tarde', 'boa noite', 'bom dia!', 'boa tarde!', 'boa noite!',
        'oi!', 'olá!', 'ola!', 'eae!', 'e aí!', 'eai!', 'opa!', 'hey!', 'hi!', 'hello!'
    ];
    
    const mensagemLimpa = mensagem.toLowerCase().trim();
    
    // Verifica se a mensagem é apenas uma saudação (sem outras palavras)
    return saudacoes.some(saudacao => {
        // Verifica se a mensagem é exatamente a saudação ou começa com ela seguida de pontuação
        const regex = new RegExp(`^${saudacao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[!?.]*$`, 'i');
        return regex.test(mensagemLimpa);
    });
}

// Função para gerar mensagem de apresentação
function gerarApresentacao(nomeBot) {
    return `👋 Olá! Eu sou o ${nomeBot}, seu assistente virtual especializado em dados agrícolas e commodities.

📊 Posso te ajudar com:

🌾 **Dados de Commodities**
   • "Quais são os dados do milho?"
   • "Dados da soja"
   • "Informações sobre produção de milho"

🌤️ **Previsão do Tempo**
   • "Qual o clima em São Paulo?"
   • "Como está o tempo em [cidade]?"
   • "Previsão do tempo para [cidade]"

💬 **Outras Perguntas**
   • Qualquer dúvida sobre agricultura, commodities ou outros assuntos!

Como posso te ajudar hoje? 😊`;
}

// Função para gerar resposta usando IA
async function gerarRespostaIA(mensagem, nomeUsuario) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: getSystemContext()
                },
                {
                    role: 'user',
                    content: mensagem
                }
            ],
            max_tokens: config.maxTokens,
            temperature: config.temperature,
        });

        const resposta = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
        return resposta;

    } catch (error) {
        console.error('❌ Erro na API OpenAI:', error);
        
        if (error.status === 401) {
            throw new Error('Chave de API inválida. Verifique sua OPENAI_API_KEY no arquivo .env');
        } else if (error.status === 429) {
            throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
        } else {
            throw new Error('Erro ao conectar com o serviço de IA.');
        }
    }
}

// Função para enviar mensagem via API do WhatsApp
async function enviarMensagem(to, message) {
    try {
        if (!WHATSAPP_API_URL) {
            throw new Error('WhatsApp não configurado');
        }
        
        const response = await axios.post(
            `${WHATSAPP_API_URL}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: {
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(`❌ Erro ao enviar mensagem: ${error.response?.status || error.message}`);
        throw error;
    }
}

// Função para enviar imagem via API do WhatsApp
async function enviarImagem(to, imagePath, caption = '') {
    if (!WHATSAPP_API_URL) {
        throw new Error('WhatsApp não configurado');
    }
    
    try {
        // Passo 1: Fazer upload da imagem para obter o media_id
        const imageBuffer = fs.readFileSync(imagePath);
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', imageBuffer, {
            filename: 'previsao.png',
            contentType: 'image/png'
        });

        const uploadResponse = await axios.post(
            `https://graph.facebook.com/v22.0/${config.phoneNumberId}/media`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    ...formData.getHeaders(),
                },
            }
        );

        const mediaId = uploadResponse.data.id;

        // Passo 2: Enviar mensagem com a imagem usando o media_id
        const messagePayload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'image',
            image: {
                id: mediaId
            }
        };

        if (caption) {
            messagePayload.image.caption = caption;
        }

        if (!WHATSAPP_API_URL) {
            throw new Error('WhatsApp não configurado');
        }
        
        const response = await axios.post(
            `${WHATSAPP_API_URL}/messages`,
            messagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(`❌ Erro ao enviar imagem: ${error.response?.status || error.message}`);
        throw error;
    }
}

// ============================================
// CONFIGURAÇÃO DO SWAGGER
// ============================================
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Bot WhatsApp - API de Módulos',
            version: '1.0.0',
            description: 'Documentação da API REST dos módulos: USDA (Commodities), OpenWeather (Clima) e Clima (Imagens)',
            contact: {
                name: 'AgroBOT',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Servidor local',
            },
        ],
        tags: [
            { name: 'USDA', description: 'API para dados de commodities agrícolas' },
            { name: 'OpenWeather', description: 'API para previsão do tempo' },
            { name: 'Clima', description: 'API para geração de imagens de previsão' },
            { name: 'Health', description: 'Endpoints de saúde do sistema' },
        ],
    },
    apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================
// ROTAS DE SAÚDE
// ============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica o status do servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor está funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 botName:
 *                   type: string
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        botName: config.botName 
    });
});

// ============================================
// ROTAS DO MÓDULO USDA (COMMODITIES)
// ============================================

/**
 * @swagger
 * /api/usda/commodities:
 *   get:
 *     summary: Lista todas as commodities disponíveis
 *     tags: [USDA]
 *     responses:
 *       200:
 *         description: Lista de commodities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
app.get('/api/usda/commodities', async (req, res) => {
    try {
        const commodities = await psdService.getCommodities();
        res.json(commodities);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/commodity/{commodityCode}/country/{countryCode}/year/{year}:
 *   get:
 *     summary: Busca dados de uma commodity por país e ano
 *     tags: [USDA]
 *     parameters:
 *       - in: path
 *         name: commodityCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da commodity (ex: 0440000 para milho)
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código do país (ex: BR para Brasil)
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ano dos dados
 *     responses:
 *       200:
 *         description: Dados da commodity
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
app.get('/api/usda/commodity/:commodityCode/country/:countryCode/year/:year', async (req, res) => {
    try {
        const { commodityCode, countryCode, year } = req.params;
        const data = await psdService.getCommodityData(commodityCode, countryCode, parseInt(year));
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/commodity/{commodityCode}/brazil/{year}:
 *   get:
 *     summary: Busca dados de uma commodity do Brasil por ano
 *     tags: [USDA]
 *     parameters:
 *       - in: path
 *         name: commodityCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da commodity (ex: 0440000 para milho, 2222000 para soja)
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ano dos dados
 *     responses:
 *       200:
 *         description: Dados da commodity do Brasil
 */
app.get('/api/usda/commodity/:commodityCode/brazil/:year', async (req, res) => {
    try {
        const { commodityCode, year } = req.params;
        const data = await psdService.getBrazilCommodityData(commodityCode, parseInt(year));
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/commodity/{commodityCode}/world/{year}:
 *   get:
 *     summary: Busca dados globais de uma commodity por ano
 *     tags: [USDA]
 *     parameters:
 *       - in: path
 *         name: commodityCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da commodity
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ano dos dados
 *     responses:
 *       200:
 *         description: Dados globais da commodity
 */
app.get('/api/usda/commodity/:commodityCode/world/:year', async (req, res) => {
    try {
        const { commodityCode, year } = req.params;
        const data = await psdService.getWorldCommodityData(commodityCode, parseInt(year));
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/commodity/{commodityCode}/data-release:
 *   get:
 *     summary: Busca datas de atualização dos dados de uma commodity
 *     tags: [USDA]
 *     parameters:
 *       - in: path
 *         name: commodityCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da commodity
 *     responses:
 *       200:
 *         description: Datas de atualização
 */
app.get('/api/usda/commodity/:commodityCode/data-release', async (req, res) => {
    try {
        const { commodityCode } = req.params;
        const data = await psdService.getDataReleaseInfo(commodityCode);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/regions:
 *   get:
 *     summary: Lista todas as regiões disponíveis
 *     tags: [USDA]
 *     responses:
 *       200:
 *         description: Lista de regiões
 */
app.get('/api/usda/regions', async (req, res) => {
    try {
        const regions = await psdService.getRegions();
        res.json(regions);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/usda/countries:
 *   get:
 *     summary: Lista todos os países disponíveis
 *     tags: [USDA]
 *     responses:
 *       200:
 *         description: Lista de países
 */
app.get('/api/usda/countries', async (req, res) => {
    try {
        const countries = await psdService.getCountries();
        res.json(countries);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// ============================================
// ROTAS DO MÓDULO OPENWEATHER
// ============================================

/**
 * @swagger
 * /api/weather/forecast/{city}:
 *   get:
 *     summary: Busca previsão do tempo para 5 dias de uma cidade
 *     tags: [OpenWeather]
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade (ex: São Paulo, Rio de Janeiro)
 *     responses:
 *       200:
 *         description: Previsão do tempo para 5 dias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 city:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     country:
 *                       type: string
 *                     state:
 *                       type: string
 *                     lat:
 *                       type: number
 *                     lon:
 *                       type: number
 *                 forecast:
 *                   type: object
 */
app.get('/api/weather/forecast/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const data = await weatherService.get5DayForecast(city);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

/**
 * @swagger
 * /api/weather/current/{city}:
 *   get:
 *     summary: Busca clima atual de uma cidade
 *     tags: [OpenWeather]
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade
 *     responses:
 *       200:
 *         description: Clima atual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 city:
 *                   type: object
 *                 weather:
 *                   type: object
 */
app.get('/api/weather/current/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const data = await weatherService.getCurrentWeather(city);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// ============================================
// ROTAS DO MÓDULO CLIMA (IMAGENS)
// ============================================

/**
 * @swagger
 * /api/clima/images/{city}/{layer}:
 *   get:
 *     summary: Verifica se existe imagem de previsão para uma cidade e camada
 *     tags: [Clima]
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade (normalizado, ex: saopaulo, chapadaodosul)
 *       - in: path
 *         name: layer
 *         required: true
 *         schema:
 *           type: string
 *           enum: [rain, temp, wind, clouds, radar, satellite, thunder, rainthunder]
 *         description: Tipo de camada da imagem
 *     responses:
 *       200:
 *         description: Informações sobre a imagem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 path:
 *                   type: string
 *       404:
 *         description: Imagem não encontrada
 */
app.get('/api/clima/images/:city/:layer', (req, res) => {
    try {
        const { city, layer } = req.params;
        
        const LAYER_FOLDERS = {
            'satellite': 'imgsat',
            'clouds': 'imgcloud',
            'radar': 'imgradar',
            'temp': 'imgtemp',
            'wind': 'imgwind',
            'rain': 'imgrain',
            'thunder': 'imgthund',
            'rainthunder': 'imgrt'
        };
        
        const folder = LAYER_FOLDERS[layer.toLowerCase()];
        if (!folder) {
            return res.status(400).json({ error: 'Camada inválida' });
        }
        
        const cityNormalized = city.toLowerCase().replace(/\s+/g, '');
        const imagePath = path.join(__dirname, 'modulos', 'clima', folder, `${cityNormalized}_windy_${layer}_24h.png`);
        
        if (fs.existsSync(imagePath)) {
            res.json({
                exists: true,
                path: imagePath,
                url: `/api/clima/images/${city}/${layer}/file`
            });
        } else {
            res.status(404).json({
                exists: false,
                message: 'Imagem não encontrada'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/clima/images/{city}/{layer}/file:
 *   get:
 *     summary: Retorna o arquivo de imagem de previsão
 *     tags: [Clima]
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade
 *       - in: path
 *         name: layer
 *         required: true
 *         schema:
 *           type: string
 *         description: Tipo de camada
 *     responses:
 *       200:
 *         description: Arquivo de imagem
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Imagem não encontrada
 */
app.get('/api/clima/images/:city/:layer/file', (req, res) => {
    try {
        const { city, layer } = req.params;
        
        const LAYER_FOLDERS = {
            'satellite': 'imgsat',
            'clouds': 'imgcloud',
            'radar': 'imgradar',
            'temp': 'imgtemp',
            'wind': 'imgwind',
            'rain': 'imgrain',
            'thunder': 'imgthund',
            'rainthunder': 'imgrt'
        };
        
        const folder = LAYER_FOLDERS[layer.toLowerCase()];
        if (!folder) {
            return res.status(400).json({ error: 'Camada inválida' });
        }
        
        const cityNormalized = city.toLowerCase().replace(/\s+/g, '');
        const imagePath = path.join(__dirname, 'modulos', 'clima', folder, `${cityNormalized}_windy_${layer}_24h.png`);
        
        if (fs.existsSync(imagePath)) {
            res.sendFile(imagePath);
        } else {
            res.status(404).json({ error: 'Imagem não encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inicia o servidor (escuta em 0.0.0.0 para funcionar no Render)
app.listen(config.port, '0.0.0.0', () => {
    console.log('🚀 Servidor iniciado!');
    console.log(`🤖 Nome: ${config.botName}`);
    console.log(`🌐 Servidor rodando na porta ${config.port}`);
    console.log(`📚 Swagger UI: http://localhost:${config.port}/api-docs`);
    console.log(`❤️  Health Check: http://localhost:${config.port}/health`);
    
    if (config.phoneNumberId && config.whatsappToken) {
        console.log(`\n📱 WhatsApp Bot configurado:`);
        console.log(`   📡 Webhook URL: ${config.webhookUrl}/webhook`);
        console.log(`   🔐 Verify Token: ${config.verifyToken}`);
        console.log(`   📱 Phone Number ID: ${config.phoneNumberId}`);
    } else {
        console.log(`\n⚠️  WhatsApp não configurado - apenas APIs REST disponíveis`);
    }
    
    console.log(`\n📋 APIs disponíveis:`);
    console.log(`   🌾 USDA: /api/usda/*`);
    console.log(`   🌤️  OpenWeather: /api/weather/*`);
    console.log(`   🗺️  Clima: /api/clima/*`);
    console.log('');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Erro não tratado:', error);
});
