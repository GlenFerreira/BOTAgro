# 🚀 Guia de Configuração - WhatsApp Cloud API (Oficial)

Este guia te ajudará a configurar o bot usando a **API oficial do WhatsApp** com número de teste.

## 📋 Pré-requisitos

1. **Node.js** (versão 18 ou superior)
2. **Conta Meta for Developers** (gratuita)
3. **Conta OpenAI** com chave de API
4. **ngrok** (para desenvolvimento local) - [Download](https://ngrok.com/)

## 🔧 Passo a Passo

### 1. Criar App no Meta for Developers

1. Acesse: https://developers.facebook.com/
2. Faça login com sua conta Facebook
3. Clique em **"Meus Apps"** > **"Criar App"**
4. Selecione **"Negócios"** como tipo de app
5. Preencha o nome do app e clique em **"Criar App"**

### 2. Adicionar Produto WhatsApp

1. No painel do app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Configurar"** ou **"Adicionar ao app"**
3. Você será redirecionado para a configuração do WhatsApp

### 3. Obter Número de Teste

1. Na página do WhatsApp, vá para **"API Setup"** (Configuração da API)
2. Você verá uma seção **"Temporary access token"** (Token de acesso temporário)
3. **Copie este token** - você precisará dele no arquivo `.env`
4. Você também verá um **"Phone number ID"** - copie este também
5. O número de teste já vem pré-configurado e você pode ver na seção **"To"**

### 4. Configurar Webhook

#### 4.1. Instalar e configurar ngrok (para desenvolvimento local)

```bash
# Baixe o ngrok em: https://ngrok.com/download
# Ou instale via npm:
npm install -g ngrok

# Execute o ngrok apontando para a porta 3000:
ngrok http 3000
```

Você verá algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copie a URL HTTPS** (ex: `https://abc123.ngrok.io`)

#### 4.2. Configurar Webhook no Meta

1. No painel do WhatsApp, vá para **"Configuration"** (Configuração)
2. Em **"Webhook"**, clique em **"Edit"**
3. Cole a URL do ngrok + `/webhook`:
   ```
   https://abc123.ngrok.io/webhook
   ```
4. Em **"Verify token"**, digite o mesmo token que você colocou no arquivo `.env` (ex: `meu_token_secreto_123`)
5. Clique em **"Verify and Save"**
6. Em **"Webhook fields"**, selecione:
   - ✅ `messages`
   - ✅ `statuses`
7. Clique em **"Save"**

### 5. Configurar Variáveis de Ambiente

1. Copie o arquivo `env.example` para `.env`:
   ```bash
   cp env.example .env
   ```

2. Edite o arquivo `.env` e preencha:

```env
# OpenAI
OPENAI_API_KEY=sk-sua-chave-openai-aqui

# WhatsApp (do Meta for Developers)
WHATSAPP_TOKEN=seu_token_temporario_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui

# Webhook
VERIFY_TOKEN=meu_token_secreto_123
WEBHOOK_URL=https://abc123.ngrok.io

# Porta
PORT=3000

# Bot
BOT_NAME=Assistente
MAX_TOKENS=500
TEMPERATURE=0.7
```

### 6. Instalar Dependências e Executar

```bash
# Instalar dependências
npm install

# Iniciar o bot
npm start
```

### 7. Testar o Bot

1. Abra o WhatsApp no celular
2. Envie uma mensagem para o **número de teste** (você encontra no painel do Meta)
3. O bot deve responder automaticamente!

## 📝 Onde encontrar as informações

### Token de Acesso (WHATSAPP_TOKEN)
- **Localização**: Meta for Developers > Seu App > WhatsApp > API Setup
- **Seção**: "Temporary access token"
- ⚠️ **Importante**: Tokens temporários expiram. Para produção, configure um token permanente.

### Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)
- **Localização**: Meta for Developers > Seu App > WhatsApp > API Setup
- **Seção**: "Phone number ID"
- É um número longo (ex: `123456789012345`)

### Número de Teste
- **Localização**: Meta for Developers > Seu App > WhatsApp > API Setup
- **Seção**: "To" (número para enviar mensagens de teste)
- Formato: `+5511999999999` (com código do país)

## 🔄 Token Permanente (Opcional - para produção)

Os tokens temporários expiram. Para produção:

1. Vá em **"API Setup"** > **"Access Tokens"**
2. Clique em **"Generate Token"**
3. Selecione as permissões necessárias
4. Use este token no lugar do token temporário

## 🌐 Deploy em Produção

Para produção, você precisará:

1. **Servidor com URL pública** (não ngrok)
2. **HTTPS obrigatório** (certificado SSL)
3. **Token permanente** (não temporário)
4. **Número de telefone verificado** (não apenas teste)

## ⚠️ Limitações do Número de Teste

- ✅ Funciona apenas com números adicionados à lista de teste
- ✅ Adicione números em: WhatsApp > API Setup > "To" (adicionar números)
- ❌ Não funciona com números não adicionados
- ❌ Expira após alguns dias (para produção, use número verificado)

## 🐛 Solução de Problemas

**Webhook não verifica:**
- Verifique se o ngrok está rodando
- Confirme que o VERIFY_TOKEN está igual no .env e no Meta
- Verifique se a URL está correta (deve terminar com `/webhook`)

**Bot não recebe mensagens:**
- Verifique se o webhook está configurado corretamente
- Confirme que os campos `messages` e `statuses` estão selecionados
- Verifique os logs do servidor

**Erro 401 (Unauthorized):**
- Token expirado ou inválido
- Gere um novo token no Meta for Developers

**Erro ao enviar mensagem:**
- Verifique se o número está na lista de teste
- Confirme que o PHONE_NUMBER_ID está correto

## 📚 Recursos Úteis

- [Documentação WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta for Developers](https://developers.facebook.com/)
- [ngrok Documentation](https://ngrok.com/docs)

