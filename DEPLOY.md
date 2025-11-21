# 🚀 Guia de Deploy no Render

Este guia explica como fazer o deploy das APIs do Bot Agro no Render.

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com) (gratuita)
2. Repositório no GitHub (já configurado)
3. Chaves de API configuradas

## 🔧 Passo a Passo

### 1. Conectar Repositório no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** > **"Web Service"**
3. Conecte seu repositório GitHub: `GlenFerreira/BOTAgro`
4. Selecione o repositório quando aparecer

### 2. Configurar o Serviço

**Configurações básicas:**
- **Name:** `bot-agro-api` (ou o nome que preferir)
- **Region:** Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch:** `main`
- **Root Directory:** (deixe vazio)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 3. Configurar Variáveis de Ambiente

No painel do Render, vá em **"Environment"** e adicione:

#### Variáveis Obrigatórias para APIs:

```env
# OpenWeather (para previsão do tempo)
OPENWEATHER_API_KEY=sua_chave_openweather

# USDA PSD (para commodities)
USDA_PSD_API_KEY=sua_chave_usda
USDA_PSD_BASE_URL=https://api.fas.usda.gov

# Windy (opcional - para imagens)
WINDY_API_KEY=sua_chave_windy
```

#### Variáveis Opcionais (para WhatsApp):

```env
# OpenAI (para IA)
OPENAI_API_KEY=sua_chave_openai

# WhatsApp (opcional - apenas se quiser usar o bot)
WHATSAPP_TOKEN=seu_token_whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
VERIFY_TOKEN=seu_token_secreto
WEBHOOK_URL=https://seu-app.onrender.com
```

#### Variáveis de Configuração:

```env
# Configuração do servidor
NODE_ENV=production
PORT=10000
BOT_NAME=AgroBOT
MAX_TOKENS=500
TEMPERATURE=0.7
```

**Nota:** O Render define automaticamente a variável `PORT`. Não é necessário configurá-la manualmente, mas você pode usar `10000` como padrão.

### 4. Deploy

1. Clique em **"Create Web Service"**
2. O Render irá:
   - Clonar o repositório
   - Instalar dependências (`npm install`)
   - Iniciar o servidor (`npm start`)
3. Aguarde o deploy completar (pode levar alguns minutos)

### 5. Verificar Deploy

Após o deploy, você receberá uma URL como:
```
https://bot-agro-api.onrender.com
```

**Teste os endpoints:**

```bash
# Health Check
curl https://bot-agro-api.onrender.com/health

# Swagger UI
https://bot-agro-api.onrender.com/api-docs

# API USDA
curl https://bot-agro-api.onrender.com/api/usda/commodities

# API OpenWeather
curl https://bot-agro-api.onrender.com/api/weather/forecast/São%20Paulo
```

## 📚 Endpoints Disponíveis

### Health Check
- `GET /health` - Status do servidor

### Swagger Documentation
- `GET /api-docs` - Interface Swagger UI

### USDA (Commodities)
- `GET /api/usda/commodities` - Lista commodities
- `GET /api/usda/commodity/:code/brazil/:year` - Dados do Brasil
- `GET /api/usda/commodity/:code/world/:year` - Dados globais
- `GET /api/usda/regions` - Lista de regiões
- `GET /api/usda/countries` - Lista de países

### OpenWeather (Clima)
- `GET /api/weather/forecast/:city` - Previsão 5 dias
- `GET /api/weather/current/:city` - Clima atual

### Clima (Imagens)
- `GET /api/clima/images/:city/:layer` - Verifica imagem
- `GET /api/clima/images/:city/:layer/file` - Retorna arquivo

### WhatsApp (Opcional)
- `GET /webhook` - Verificação do webhook
- `POST /webhook` - Recebe mensagens

## ⚙️ Configurações Avançadas

### Usando render.yaml

O projeto inclui um arquivo `render.yaml` que pode ser usado para configurar o serviço via código.

**Nota:** No plano gratuito do Render, você precisa configurar as variáveis de ambiente manualmente no painel.

### Auto-Deploy

Por padrão, o Render faz auto-deploy sempre que você faz push para a branch `main`.

Para desabilitar:
1. Vá em **Settings** > **Build & Deploy**
2. Desmarque **"Auto-Deploy"**

### Custom Domain

Para usar um domínio personalizado:
1. Vá em **Settings** > **Custom Domains**
2. Adicione seu domínio
3. Configure o DNS conforme as instruções

## 🔒 Segurança

### Variáveis Sensíveis

- ✅ **Nunca** commite chaves de API no código
- ✅ Use variáveis de ambiente no Render
- ✅ Marque variáveis sensíveis como **"Secret"** no Render

### Rate Limiting

O Render tem limites no plano gratuito:
- **Sleep após 15 minutos de inatividade** (primeira requisição pode demorar)
- **Limite de requisições** (verifique o plano)

Para produção, considere:
- Plano pago do Render
- Ou outra plataforma (Heroku, Railway, etc.)

## 🐛 Troubleshooting

### Servidor não inicia

1. Verifique os logs no Render Dashboard
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Verifique se o `package.json` tem o script `start` correto

### Erro 503 (Service Unavailable)

- O servidor pode estar "dormindo" (plano gratuito)
- Aguarde alguns segundos e tente novamente
- A primeira requisição após inatividade pode demorar

### Erro 401 (Unauthorized)

- Verifique se as chaves de API estão corretas
- Confirme que as variáveis de ambiente foram salvas

### Porta não encontrada

- O Render define automaticamente a variável `PORT`
- O código já está configurado para usar `process.env.PORT`

## 📝 Notas Importantes

1. **Plano Gratuito:**
   - Servidor "dorme" após 15 minutos de inatividade
   - Primeira requisição após dormir pode demorar ~30 segundos
   - Ideal para desenvolvimento e testes

2. **Variáveis de Ambiente:**
   - Configure todas no painel do Render
   - Não use arquivo `.env` (não será commitado)

3. **Logs:**
   - Acesse logs em tempo real no Render Dashboard
   - Útil para debug

4. **WhatsApp:**
   - O webhook do WhatsApp é opcional
   - As APIs REST funcionam independentemente
   - Configure `WEBHOOK_URL` com a URL do Render se usar WhatsApp

## 🔗 Links Úteis

- [Render Dashboard](https://dashboard.render.com)
- [Documentação Render](https://render.com/docs)
- [Status do Render](https://status.render.com)

## ✅ Checklist de Deploy

- [ ] Repositório conectado no Render
- [ ] Serviço criado e configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Deploy concluído com sucesso
- [ ] Health check funcionando
- [ ] Swagger UI acessível
- [ ] APIs testadas

