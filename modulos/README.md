# 📦 Módulos do Bot WhatsApp

Este diretório contém os módulos auxiliares que fornecem funcionalidades específicas para o bot de WhatsApp.

## 📋 Índice

- [Estrutura](#estrutura)
- [Módulos Disponíveis](#módulos-disponíveis)
  - [USDA - Commodities Agrícolas](#usda---commodities-agrícolas)
  - [OpenWeather - Previsão do Tempo](#openweather---previsão-do-tempo)
  - [Clima - Geração de Imagens](#clima---geração-de-imagens)
  - [Utils - Utilitários](#utils---utilitários)
- [API REST](#api-rest)
- [Configuração](#configuração)
- [Documentação Swagger](#documentação-swagger)

## 📁 Estrutura

```
modulos/
├── USDA/                    # Módulo de commodities agrícolas
│   ├── config.js           # Configuração da API USDA
│   ├── psdService.js       # Serviço de comunicação com a API
│   └── commodityHandler.js # Handler para processar mensagens
├── openweather/            # Módulo de previsão do tempo
│   ├── config.js           # Configuração da API OpenWeather
│   ├── weatherService.js    # Serviço de comunicação com a API
│   └── weatherHandler.js   # Handler para processar mensagens
├── clima/                  # Módulo de geração de imagens
│   ├── config.js           # Configuração da API Windy
│   ├── forecastEMCWF.mjs   # Script de geração de imagens
│   └── [pastas de imagens]/ # Imagens geradas por camada
├── utils/                  # Utilitários compartilhados
│   └── textNormalizer.js   # Normalização de texto com IA
├── .env                    # Variáveis de ambiente dos módulos
└── README.md               # Este arquivo
```

## 🔧 Módulos Disponíveis

### 🌾 USDA - Commodities Agrícolas

Fornece dados de commodities agrícolas através da API USDA PSD (Production, Supply and Distribution).

**Arquivos:**
- `config.js` - Configuração da API (chave, URL base)
- `psdService.js` - Serviço para comunicação com a API USDA
- `commodityHandler.js` - Handler que detecta intenções e processa mensagens

**Commodities Suportadas:**
- Milho (código: 0440000)
- Soja (código: 2222000)
- Trigo (código: 0410000)
- Café (código: 0411100)
- Algodão (código: 0422000)
- Açúcar (código: 0416000)
- Arroz (código: 0443000)

**Dados Fornecidos:**
- Produção
- Exportação
- Importação
- Estoque Final
- Área Plantada
- Consumo Doméstico
- Oferta Total
- Uso Total

**Exemplo de Uso no Bot:**
```
Usuário: "Quais são os dados do milho?"
Bot: Retorna dados formatados da commodity
```

### 🌤️ OpenWeather - Previsão do Tempo

Fornece previsão do tempo para qualquer cidade usando a API OpenWeather Map.

**Arquivos:**
- `config.js` - Configuração da API (chave, URL base)
- `weatherService.js` - Serviço para comunicação com a API OpenWeather
- `weatherHandler.js` - Handler que detecta intenções e processa mensagens

**Funcionalidades:**
- Previsão do tempo para 5 dias (intervalos de 3 horas)
- Clima atual
- Dados de temperatura, umidade, vento, chuva
- Suporte para imagens de previsão (quando disponíveis)

**Exemplo de Uso no Bot:**
```
Usuário: "Qual o clima em São Paulo?"
Bot: Retorna previsão formatada para 5 dias
```

### 🗺️ Clima - Geração de Imagens

Gera imagens de previsão do tempo usando a API Windy e Puppeteer.

**Arquivos:**
- `config.js` - Configuração da API Windy
- `forecastEMCWF.mjs` - Script para gerar imagens de previsão

**Camadas Disponíveis:**
- `rain` - Chuva
- `temp` - Temperatura
- `wind` - Vento
- `clouds` - Nuvens
- `radar` - Radar
- `satellite` - Satélite
- `thunder` - Trovões
- `rainthunder` - Chuva e trovões

**Estrutura de Pastas:**
```
clima/
├── imgrain/      # Imagens de chuva
├── imgtemp/      # Imagens de temperatura
├── imgwind/      # Imagens de vento
├── imgcloud/     # Imagens de nuvens
├── imgradar/     # Imagens de radar
├── imgsat/       # Imagens de satélite
├── imgthund/     # Imagens de trovões
└── imgrt/        # Imagens de chuva e trovões
```

**Uso:**
```bash
node forecastEMCWF.mjs [horas] [camada] [cidade]
# Exemplo:
node forecastEMCWF.mjs 24 rain "São Paulo"
```

### 🛠️ Utils - Utilitários

Utilitários compartilhados entre os módulos.

**Arquivos:**
- `textNormalizer.js` - Normalização de texto usando IA (OpenAI)

**Funcionalidades:**
- Correção de acentos em nomes de cidades
- Correção de erros de digitação em nomes de commodities
- Normalização geral de texto

## 🌐 API REST

Todos os módulos estão disponíveis através de rotas HTTP REST. A documentação completa está disponível via Swagger.

### Endpoints Disponíveis

#### USDA (Commodities)

- `GET /api/usda/commodities` - Lista todas as commodities
- `GET /api/usda/commodity/:code/country/:country/year/:year` - Dados por país e ano
- `GET /api/usda/commodity/:code/brazil/:year` - Dados do Brasil
- `GET /api/usda/commodity/:code/world/:year` - Dados globais
- `GET /api/usda/commodity/:code/data-release` - Datas de atualização
- `GET /api/usda/regions` - Lista de regiões
- `GET /api/usda/countries` - Lista de países

#### OpenWeather (Clima)

- `GET /api/weather/forecast/:city` - Previsão para 5 dias
- `GET /api/weather/current/:city` - Clima atual

#### Clima (Imagens)

- `GET /api/clima/images/:city/:layer` - Verifica se existe imagem
- `GET /api/clima/images/:city/:layer/file` - Retorna arquivo de imagem

#### Health

- `GET /health` - Status do servidor

### Exemplos de Uso

```bash
# Buscar dados de milho do Brasil em 2025
curl http://localhost:3000/api/usda/commodity/0440000/brazil/2025

# Previsão do tempo para São Paulo
curl http://localhost:3000/api/weather/forecast/São%20Paulo

# Verificar se existe imagem de chuva para São Paulo
curl http://localhost:3000/api/clima/images/saopaulo/rain
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie o arquivo `modulos/.env` com as seguintes variáveis:

```env
# USDA PSD API
USDA_PSD_API_KEY=sua_chave_usda_aqui
USDA_PSD_BASE_URL=https://api.fas.usda.gov

# Windy API (para geração de imagens)
WINDY_API_KEY=sua_chave_windy_aqui
```

**Nota:** A chave da OpenWeather deve estar no `.env` da raiz do projeto:

```env
OPENWEATHER_API_KEY=sua_chave_openweather_aqui
```

### Como Obter as Chaves

1. **USDA PSD API:**
   - Registre-se em: https://apps.fas.usda.gov/psdonline/app/index.html#/app/home
   - Obtenha sua chave de API

2. **OpenWeather:**
   - Crie uma conta em: https://openweathermap.org/api
   - Gere uma chave de API gratuita

3. **Windy:**
   - Acesse: https://www.windy.com/
   - Obtenha sua chave de API

## 📚 Documentação Swagger

A documentação completa da API está disponível via Swagger UI quando o servidor está rodando:

**URL:** `http://localhost:3000/api-docs`

A documentação Swagger inclui:
- Descrição de todos os endpoints
- Parâmetros necessários
- Exemplos de requisições e respostas
- Códigos de status HTTP
- Schemas de dados

### Acessando a Documentação

1. Inicie o servidor:
   ```bash
   npm start
   ```

2. Acesse no navegador:
   ```
   http://localhost:3000/api-docs
   ```

3. Explore os endpoints disponíveis e teste diretamente pela interface Swagger.

## 🔄 Integração com o Bot

Os módulos são automaticamente integrados ao bot do WhatsApp:

1. **Detecção de Intenção:** O bot detecta automaticamente quando o usuário pergunta sobre commodities ou clima
2. **Processamento:** Os handlers processam a mensagem e extraem informações relevantes
3. **Busca de Dados:** Os serviços fazem chamadas às APIs externas
4. **Formatação:** Os dados são formatados de forma amigável para o usuário
5. **Resposta:** O bot envia a resposta formatada via WhatsApp

## 🐛 Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se as chaves de API estão corretas no arquivo `.env`
- Confirme se as chaves não expiraram

### Erro 404 (Not Found)
- Verifique se os códigos de commodity ou nomes de cidade estão corretos
- Alguns dados podem não estar disponíveis para todos os anos

### Imagens não encontradas
- Execute o script `forecastEMCWF.mjs` para gerar as imagens
- Verifique se o nome da cidade está normalizado (sem espaços, acentos)

## 📝 Notas

- As APIs externas podem ter limites de requisições
- Alguns dados podem não estar disponíveis para todos os anos
- As imagens de previsão precisam ser geradas manualmente usando o script
- A normalização de texto usa a API OpenAI (requer créditos)

## 🔗 Links Úteis

- [Documentação USDA PSD API](https://apps.fas.usda.gov/psdonline/app/index.html#/app/help)
- [Documentação OpenWeather API](https://openweathermap.org/api)
- [Documentação Windy API](https://www.windy.com/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

