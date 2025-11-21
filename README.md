# Bot WhatsApp com Linguagem Natural 🤖

Bot inteligente para WhatsApp que responde mensagens usando processamento de linguagem natural através de IA, usando a **API Oficial do WhatsApp (WhatsApp Cloud API)**.

## ✨ Características

- ✅ **API Oficial do WhatsApp** - Usa WhatsApp Cloud API v22.0 (oficial e permitida)
- ✅ **Número de Teste Gratuito** - Funciona com número de teste do Meta
- ✅ **IA Integrada** - Respostas inteligentes usando OpenAI GPT-3.5-turbo
- ✅ **Módulo de Commodities** - Dados agrícolas em tempo real via USDA PSD API
- ✅ **Módulo de Clima** - Previsão do tempo 5 dias via OpenWeather API
- ✅ **Envio de Imagens** - Suporte para envio de imagens de previsão do tempo
- ✅ **Webhook** - Recebe mensagens em tempo real
- ✅ **Fácil Configuração** - Guia passo a passo completo

## 📋 Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   - Baixe em: https://nodejs.org/

2. **Conta Meta for Developers** (gratuita)
   - Crie em: https://developers.facebook.com/

3. **Conta OpenAI** com chave de API
   - Crie uma conta em: https://platform.openai.com/
   - Gere uma chave de API em: https://platform.openai.com/api-keys
   - ⚠️ **Nota**: A API da OpenAI é paga, mas oferece créditos iniciais gratuitos

4. **Conta OpenWeather** (opcional, para previsão do tempo)
   - Crie uma conta em: https://openweathermap.org/api
   - Gere uma chave de API gratuita

5. **Conta USDA PSD** (opcional, para dados de commodities)
   - Registre-se em: https://apps.fas.usda.gov/psdonline/app/index.html#/app/home
   - Obtenha sua chave de API

6. **ngrok** (para desenvolvimento local)
   - Baixe em: https://ngrok.com/download
   - Ou instale: `npm install -g ngrok`

## 🚀 Instalação Rápida

### 1. Clone e instale dependências

```bash
npm install
```

### 2. Configure o Meta for Developers

Siga o guia completo em **[SETUP.md](./SETUP.md)** para:
- Criar app no Meta for Developers
- Obter token e Phone Number ID
- Configurar webhook
- Obter número de teste

### 3. Configure variáveis de ambiente

Copie `env.example` para `.env` e preencha:

```bash
cp env.example .env
```

Edite o arquivo `.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-sua-chave-aqui

# WhatsApp (do Meta for Developers)
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
VERIFY_TOKEN=meu_token_secreto_123
WEBHOOK_URL=https://seu-id.ngrok.io

# OpenWeather (opcional - para previsão do tempo)
OPENWEATHER_API_KEY=sua_chave_openweather_aqui
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Porta
PORT=3000

# Bot
BOT_NAME=Assistente
MAX_TOKENS=500
TEMPERATURE=0.7
```

**Importante**: Crie também o arquivo `modulos/.env` para as APIs auxiliares:

```env
# USDA PSD API (para dados de commodities)
USDA_PSD_API_KEY=sua_chave_usda_aqui
USDA_PSD_BASE_URL=https://api.fas.usda.gov

# Windy API (opcional - para imagens de previsão)
WINDY_API_KEY=sua_chave_windy_aqui
```

### 4. Inicie o ngrok (em outro terminal)

```bash
ngrok http 3000
```

Copie a URL HTTPS (ex: `https://abc123.ngrok.io`) e atualize `WEBHOOK_URL` no `.env`.

### 5. Configure o webhook no Meta

1. Acesse: Meta for Developers > Seu App > WhatsApp > Configuration
2. Em "Webhook", cole: `https://seu-id.ngrok.io/webhook`
3. Em "Verify token", use o mesmo valor de `VERIFY_TOKEN` do `.env`
4. Selecione os campos: `messages` e `statuses`
5. Salve

### 6. Inicie o bot

```bash
npm start
```

### 7. Teste!

Envie uma mensagem para o número de teste (encontrado no Meta for Developers).

## 📖 Documentação Completa

Para instruções detalhadas passo a passo, consulte **[SETUP.md](./SETUP.md)**.

## ⚙️ Configurações

Edite o arquivo `.env` para personalizar:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `OPENAI_API_KEY` | Chave da API OpenAI (obrigatório) | - |
| `WHATSAPP_TOKEN` | Token de acesso do Meta (obrigatório) | - |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone (obrigatório) | - |
| `VERIFY_TOKEN` | Token de verificação do webhook | `meu_token_secreto_123` |
| `WEBHOOK_URL` | URL pública do servidor | - |
| `OPENWEATHER_API_KEY` | Chave da API OpenWeather (opcional) | - |
| `OPENWEATHER_BASE_URL` | URL base da API OpenWeather | `https://api.openweathermap.org/data/2.5` |
| `PORT` | Porta do servidor | `3000` |
| `BOT_NAME` | Nome do bot | `Assistente` |
| `MAX_TOKENS` | Tamanho máximo da resposta | `500` |
| `TEMPERATURE` | Criatividade (0.0-1.0) | `0.7` |

**Variáveis em `modulos/.env`:**

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `USDA_PSD_API_KEY` | Chave da API USDA PSD (opcional) | - |
| `USDA_PSD_BASE_URL` | URL base da API USDA | `https://api.fas.usda.gov` |
| `WINDY_API_KEY` | Chave da API Windy (opcional) | - |

## 📦 O que está incluído

- ✅ **API Oficial WhatsApp** - WhatsApp Cloud API v22.0 via Meta Graph API
- ✅ **Servidor Webhook** - Express.js para receber mensagens
- ✅ **Integração OpenAI** - Respostas inteligentes com GPT-3.5-turbo
- ✅ **Módulo USDA** - Dados de commodities (milho, soja, etc.) em tempo real
- ✅ **Módulo OpenWeather** - Previsão do tempo para qualquer cidade (5 dias)
- ✅ **Envio de Imagens** - Suporte para envio de imagens de previsão do tempo
- ✅ **Tratamento de Erros** - Logs detalhados e tratamento robusto
- ✅ **Health Check** - Endpoint `/health` para monitoramento

## 🔧 Estrutura do Projeto

```
.
├── index.js                    # Servidor principal e lógica do bot
├── package.json                # Dependências do projeto
├── env.example                 # Exemplo de variáveis de ambiente
├── SETUP.md                    # Guia completo de configuração
├── README.md                   # Este arquivo
├── .gitignore                  # Arquivos ignorados pelo Git
└── modulos/                    # Módulos auxiliares
    ├── .env                    # Variáveis de ambiente dos módulos
    ├── USDA/                   # Módulo de commodities
    │   ├── config.js
    │   ├── psdService.js
    │   └── commodityHandler.js
    ├── openweather/            # Módulo de previsão do tempo
    │   ├── config.js
    │   ├── weatherService.js
    │   └── weatherHandler.js
    └── clima/                  # Módulo de geração de imagens
        ├── forecastEMCWF.mjs
        └── config.js
```

## 🔄 Como Funciona

1. **Webhook recebe mensagem** → Meta envia mensagem para `/webhook`
2. **Processa mensagem** → Extrai texto e remetente
3. **Detecta intenção** → Identifica se é pergunta sobre commodities, clima ou geral
4. **Busca dados** → Se for commodity ou clima, busca dados da API específica
5. **Gera resposta** → Usa IA como fallback ou para outras perguntas
6. **Envia resposta** → Usa WhatsApp Cloud API v22.0 para enviar texto ou imagem

## 💬 Exemplos de Uso

### Dados de Commodities
- "Quais são os dados do milho?"
- "Dados da soja"
- "Informações sobre produção de milho"

### Previsão do Tempo
- "Qual o clima em São Paulo?"
- "Como está o tempo em Chapadão do Sul?"
- "Previsão do tempo para [cidade]"

### Conversação Geral
- Qualquer outra pergunta será respondida pela IA

## 🔧 Alternativas de API de IA

Você pode substituir a OpenAI por outras APIs:

- **Google Gemini**: Use `@google/generative-ai`
- **Anthropic Claude**: Use `@anthropic-ai/sdk`
- **Hugging Face**: Use `@huggingface/inference`

## ⚠️ Limitações do Número de Teste

- ✅ Funciona apenas com números adicionados à lista de teste
- ✅ Adicione números em: Meta for Developers > WhatsApp > API Setup
- ❌ Não funciona com números não autorizados
- ⏰ Tokens temporários expiram (use token permanente para produção)

## 🐛 Solução de Problemas

**Webhook não verifica:**
- Verifique se o ngrok está rodando
- Confirme que `VERIFY_TOKEN` está igual no `.env` e no Meta
- URL deve terminar com `/webhook`

**Bot não recebe mensagens:**
- Verifique se webhook está configurado
- Confirme campos `messages` e `statuses` selecionados
- Verifique logs do servidor

**Erro 401 (Unauthorized):**
- Token expirado ou inválido
- Gere novo token no Meta for Developers
- ⚠️ **Importante**: Certifique-se de que o token está completo no `.env` (sem espaços ou quebras de linha)
- O token deve começar com `EA` e ter mais de 200 caracteres
- Após adicionar números de teste, pode ser necessário gerar um novo token

**Erro ao enviar mensagem:**
- Verifique se número está na lista de teste
- Confirme `PHONE_NUMBER_ID` correto

## 🌐 Deploy em Produção

Para produção, você precisará:

1. **Servidor com URL pública** (não ngrok)
2. **HTTPS obrigatório** (certificado SSL)
3. **Token permanente** (não temporário)
4. **Número verificado** (não apenas teste)

## 📚 Recursos Úteis

- [Documentação WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta for Developers](https://developers.facebook.com/)
- [ngrok Documentation](https://ngrok.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenWeather API Documentation](https://openweathermap.org/api)
- [USDA PSD API Documentation](https://apps.fas.usda.gov/psdonline/app/index.html#/app/home)

## 📝 Licença

ISC
