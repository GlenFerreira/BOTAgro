import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Inicializa OpenAI se tiver chave
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Normaliza texto usando IA (corrige acentos, erros de digitação)
 * @param {string} texto - Texto a normalizar
 * @param {string} tipo - Tipo de normalização: 'cidade', 'commodity', ou 'geral'
 * @returns {Promise<string>} Texto normalizado
 */
export async function normalizarTextoComIA(texto, tipo = 'geral') {
    // Se não tiver OpenAI configurado, retorna o texto original
    if (!openai) {
        return texto;
    }

    try {
        let prompt = '';
        
        if (tipo === 'cidade') {
            prompt = `Corrija e normalize o nome da cidade brasileira abaixo, adicionando acentos corretos e capitalização apropriada. Retorne APENAS o nome corrigido, sem explicações, sem aspas, sem pontos finais.

Exemplos:
- "sao paulo" → São Paulo
- "chapadao do sul" → Chapadão do Sul
- "rio de janeiro" → Rio de Janeiro
- "brasilia" → Brasília
- "chapadao" → Chapadão

Nome a corrigir: ${texto}`;
        } else if (tipo === 'commodity') {
            prompt = `Corrija e normalize o nome da commodity agrícola abaixo, adicionando acentos corretos. Retorne APENAS o nome corrigido em português, sem explicações, sem aspas, sem pontos finais.

Exemplos:
- "sojx" → soja
- "milh" → milho
- "acucar" → açúcar
- "algodao" → algodão
- "cafe" → café

Nome a corrigir: ${texto}`;
        } else {
            prompt = `Corrija e normalize o texto abaixo, adicionando acentos corretos em português brasileiro. Retorne APENAS o texto corrigido, sem explicações, sem aspas, sem pontos finais.

Texto a corrigir: ${texto}`;
        }
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente especializado em correção de texto em português brasileiro. Retorne APENAS o texto corrigido, sem explicações adicionais.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 50,
            temperature: 0.3
        });
        
        const textoNormalizado = completion.choices[0]?.message?.content?.trim() || texto;
        // Remove aspas se houver
        return textoNormalizado.replace(/^["']|["']$/g, '').trim();
        
    } catch (error) {
        // Se falhar, retorna o texto original
        return texto;
    }
}

