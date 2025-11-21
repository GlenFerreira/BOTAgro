# Previsão Meteorológica Windy (ECMWF)

Este projeto contém duas ferramentas para gerar mapas de previsão meteorológica usando a API do Windy (Map Forecast API):

1. **Script Node.js** (`forecastEMCWF.mjs`) - Geração de mapas via linha de comando
2. **Interface Web** (`index.html`) - Aplicação web interativa com múltiplas funcionalidades

---

# 📜 Script Node.js - forecastEMCWF.mjs

Este script gera mapas de previsão meteorológica usando a API do Windy (Map Forecast API) com suporte para visualização do Brasil inteiro ou foco em cidades específicas.

## 📋 Descrição

O script `forecastEMCWF.mjs` utiliza a API do Windy para gerar mapas de previsão meteorológica com:
- **Suporte a múltiplas camadas**: satélite, nuvens, radar, temperatura, vento, chuva, trovão
- **Visualização do Brasil**: mapa completo do Brasil com zoom otimizado
- **Foco em cidades**: zoom dinâmico e contorno da cidade quando uma cidade é especificada
- **Legenda automática**: legenda informativa com interpretação das cores e dados da previsão

## 🚀 Instalação

```bash
# Instalar dependências
npm install
```

## 📦 Dependências

- `puppeteer`: Para capturar screenshots do mapa Windy renderizado no navegador
- `canvas`: Para processamento de imagens e desenho de contornos
- `node-fetch`: Para requisições HTTP (busca de limites de cidades)

## 💻 Como Usar

### Sintaxe Básica

```bash
node forecastEMCWF.mjs [horas] [camada] [cidade]
```

### Parâmetros

1. **horas** (opcional): Horas à frente para a previsão (padrão: `24`)
   - Exemplos: `12`, `24`, `48`, `72`

2. **camada** (opcional): Tipo de camada meteorológica (padrão: `satellite`)
   - `satellite`: Imagem de satélite
   - `clouds`: Nuvens
   - `radar`: Radar meteorológico
   - `temp`: Temperatura
   - `wind`: Vento
   - `rain`: Chuva
   - `thunder`: Trovão
   - `rainthunder`: Chuva e trovão

3. **cidade** (opcional): Nome da cidade para focar (padrão: Brasil inteiro)
   - Exemplos: `"São Paulo"`, `"Rio de Janeiro"`, `"Brasília"`

### Exemplos de Uso

#### Visualização do Brasil Inteiro

```bash
# Previsão de temperatura para 24h (Brasil)
node forecastEMCWF.mjs 24 temp

# Previsão de chuva para 48h (Brasil)
node forecastEMCWF.mjs 48 rain

# Previsão de vento para 12h (Brasil)
node forecastEMCWF.mjs 12 wind
```

#### Visualização de Cidades Específicas

```bash
# Previsão de temperatura para São Paulo (24h)
node forecastEMCWF.mjs 24 temp "São Paulo"

# Previsão de chuva para Rio de Janeiro (48h)
node forecastEMCWF.mjs 48 rain "Rio de Janeiro"

# Previsão de vento para Brasília (12h)
node forecastEMCWF.mjs 12 wind "Brasília"

# Previsão de nuvens para Curitiba (36h)
node forecastEMCWF.mjs 36 clouds "Curitiba"
```

## 🎯 Funcionalidades

### 1. Zoom Dinâmico para Cidades

Quando uma cidade é especificada:
- O script busca automaticamente os limites administrativos da cidade
- Calcula o zoom ideal para que a cidade caiba completamente na imagem
- Centraliza o mapa na cidade
- Desenha o contorno da cidade (quando disponível)

### 2. Busca de Limites de Cidades

O script utiliza múltiplas fontes para buscar limites de cidades:
1. **Overpass API**: Busca limites administrativos (admin_level 8 e 9)
2. **Nominatim (OpenStreetMap)**: Busca polígonos de cidades
3. **Fallback**: Se não encontrar limites, usa um círculo aproximado

### 3. Contorno de Cidades

- Desenha o contorno da cidade em amarelo quando disponível
- Valida coordenadas antes de desenhar
- Suporta Polygon e MultiPolygon
- Ajusta automaticamente para o sistema de coordenadas do Leaflet

### 4. Legenda Automática

A legenda inclui:
- **Título**: Nome da camada (ex: "Temperatura", "Vento")
- **Modelo**: ECMWF (European Centre for Medium-Range Weather Forecasts)
- **Previsão**: Data/hora da previsão e horas à frente
- **Data de geração**: Data em que o mapa foi gerado
- **Interpretação**: Explicação do que cada cor representa

#### Interpretações por Camada

**Temperatura (temp)**:
- Azul: Frio (< 15°C)
- Verde: Moderado (15-25°C)
- Amarelo: Quente (25-30°C)
- Vermelho: Muito Quente (> 30°C)

**Vento (wind)**:
- Azul claro: Vento fraco (< 10 km/h)
- Verde: Vento moderado (10-25 km/h)
- Amarelo: Vento forte (25-40 km/h)
- Vermelho: Vento muito forte (> 40 km/h)

**Chuva (rain)**:
- Azul: Sem chuva
- Verde: Chuva leve (< 5 mm/h)
- Amarelo: Chuva moderada (5-15 mm/h)
- Vermelho: Chuva forte (> 15 mm/h)

**Chuva e Trovão (rainthunder)**:
- Azul: Sem atividade
- Verde: Chuva leve
- Amarelo: Chuva moderada
- Vermelho: Tempestades intensas

**Nuvens (clouds)**:
- Branco/Cinza claro: Sem nuvens
- Cinza: Nuvens baixas
- Cinza escuro: Nuvens médias
- Preto: Nuvens densas/altas

**Satélite (satellite)**:
- Branco/Ciano: Nuvens muito altas
- Verde: Nuvens médias
- Amarelo/Laranja: Nuvens baixas
- Vermelho/Preto: Superfície/Céu limpo

**Trovão (thunder)**:
- Azul: Sem atividade
- Amarelo: Atividade elétrica leve
- Laranja: Atividade moderada
- Vermelho: Tempestades intensas

**Radar (radar)**:
- Azul: Sem precipitação
- Verde: Precipitação leve
- Amarelo: Precipitação moderada
- Vermelho: Precipitação intensa

### 5. Posicionamento Inteligente da Legenda

- **Para cidades**: Legenda no canto inferior direito (para não sobrepor a cidade)
- **Para Brasil**: Legenda no canto superior direito

## 📁 Arquivos Gerados

O script gera arquivos PNG com o seguinte padrão de nome:

```
brasil_windy_[camada]_[horas]h.png
```

Exemplos:
- `brasil_windy_temp_24h.png` - Temperatura, 24h à frente
- `brasil_windy_rain_48h.png` - Chuva, 48h à frente
- `brasil_windy_wind_12h.png` - Vento, 12h à frente

## ⚙️ Configurações

### Chave API do Windy

A chave API está configurada no início do arquivo:

```javascript
const WINDY_API_KEY = "W3a5oVf2JRjJaQy6ktcuS9wkktRRnUYC";
```

**Nota**: Se você tiver sua própria chave API, substitua este valor.

### Dimensões da Imagem

- **Tamanho do mapa renderizado**: 1808x1808 pixels
- **Tamanho do crop final**: 800x800 pixels
- **Zoom padrão (Brasil)**: 4.1
- **Zoom mínimo (cidades)**: 6
- **Zoom padrão (cidades sem limites)**: 8

### Limites Geográficos do Brasil

```javascript
const minLon = -75; // oeste
const maxLon = -34; // leste
const minLat = -35; // sul
const maxLat = 6;   // norte
```

## 🔧 Estrutura do Código

### Funções Principais

1. **`getCityCoordinates(cityName)`**: Busca coordenadas de uma cidade
   - Primeiro tenta arquivo local `capitals.json`
   - Depois tenta API Open-Meteo Geocoding

2. **`getCityBoundary(cityName, lat, lon)`**: Busca limites administrativos
   - Tenta Overpass API
   - Tenta Nominatim
   - Fallback para círculo aproximado

3. **`calculateZoomForBounds(...)`**: Calcula zoom ideal para uma área

4. **`calculateGeometryBounds(geometry)`**: Calcula bounding box de uma geometria

5. **`drawCityContour(...)`**: Desenha contorno da cidade no canvas

6. **`captureWindyMap(...)`**: Captura screenshot do mapa Windy usando Puppeteer

7. **`drawWindyLegend(...)`**: Desenha legenda no canvas

## 🐛 Troubleshooting

### Contorno da cidade não aparece

- Verifique os logs do console para mensagens de erro
- Algumas cidades podem não ter limites disponíveis nas APIs
- O script usa um círculo aproximado como fallback

### Zoom muito grande ou muito pequeno

- O zoom é calculado automaticamente baseado nos limites da cidade
- Se a cidade não tiver limites, usa zoom padrão de 8
- Você pode ajustar o zoom mínimo/máximo no código se necessário

### Erro ao buscar limites da cidade

- Verifique sua conexão com a internet
- As APIs (Overpass e Nominatim) podem estar temporariamente indisponíveis
- O script usa fallback automático (círculo aproximado)

### Imagem não é gerada

- Verifique se o Puppeteer está instalado corretamente
- Verifique se a chave API do Windy é válida
- Verifique os logs do console para erros específicos

## 📝 Notas

- O script usa a **Windy Map Forecast API** que requer renderização em navegador
- O Puppeteer é usado para renderizar o mapa e capturar screenshot
- As coordenadas são convertidas usando a projeção Web Mercator (mesma do Leaflet)
- O contorno do Brasil não é desenhado quando usando cidades (o mapa Windy já mostra)

## 🔗 Referências

- [Windy API Documentation](https://api.windy.com/)
- [OpenStreetMap Nominatim](https://nominatim.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [ECMWF](https://www.ecmwf.int/)

## 📄 Licença

Este script é parte do projeto agroclima.

---

# 🌐 Interface Web - index.html

Aplicação web interativa para visualização e geração de mapas de previsão meteorológica com recursos avançados.

## 📋 Descrição

A interface web `index.html` oferece uma experiência completa para visualização de previsões meteorológicas com:

- **Visualização interativa**: Mapa Windy integrado diretamente no navegador
- **Múltiplos modos de seleção**: Brasil inteiro, busca por cidade ou desenho de área personalizada
- **Seleção de datas**: Botões para escolher previsões de diferentes dias (hoje + 7 dias)
- **Atualização automática**: Mapa atualiza automaticamente ao selecionar uma data
- **Desenho de áreas**: Desenhe polígonos no mapa para gerar previsões de áreas específicas (ex: áreas agrícolas)
- **Visualização de satélite**: Integração com imagens do satélite GOES-19 em tempo real
- **Geração de imagens**: Capture e baixe mapas personalizados em alta qualidade

## 🚀 Como Usar

### Abrir a Interface

1. Abra o arquivo `index.html` em um navegador moderno
2. Ou sirva via servidor HTTP local:
   ```bash
   # Usando Python
   python -m http.server 8000
   
   # Usando Node.js (http-server)
   npx http-server
   ```
3. Acesse `http://localhost:8000/Windy/index.html`

### Funcionalidades Principais

#### 1. Seleção de Modo

Três modos disponíveis:

- **Buscar por Cidade**: Digite o nome de uma cidade e o sistema busca automaticamente
- **Brasil Inteiro**: Visualização completa do país
- **Desenhar Área Personalizada**: Desenhe um polígono no mapa para áreas específicas

#### 2. Seleção de Data

- Barra de datas acima do mapa mostra os próximos 8 dias
- Clique em qualquer data para ver a previsão daquele dia
- O mapa atualiza automaticamente ao selecionar uma data
- Badge "Hoje" identifica o dia atual

#### 3. Desenho de Áreas

Para desenhar uma área personalizada:

1. Selecione "Desenhar Área Personalizada" no modo de seleção
2. Clique em "✏️ Desenhar Área" para ativar o modo de desenho
3. Clique no mapa para adicionar pontos (mínimo 3 pontos)
4. Para fechar: duplo clique OU clique próximo ao primeiro ponto
5. Clique em "🗺️ Gerar Mapa" para gerar a previsão da área

#### 4. Visualização de Satélite

- Clique em "🛰️ Satélite GOES-19" para ver a última imagem do satélite
- A imagem mostra o Brasil com legenda completa
- Clique em "← Voltar ao Mapa Windy" para retornar

#### 5. Geração de Imagens

- Configure camada, horas e área/cidade desejada
- Clique em "🗺️ Gerar Mapa" para processar
- Após processar, clique em "💾 Baixar Imagem" para salvar

## 🎯 Funcionalidades Detalhadas

### Modos de Seleção

#### Buscar por Cidade
- Busca automática de coordenadas e limites da cidade
- Zoom dinâmico para enquadrar a cidade
- Contorno da cidade destacado em amarelo
- Máscara escurece o resto do mapa

#### Brasil Inteiro
- Visualização completa do país
- Zoom otimizado para mostrar todo o território
- Legenda no canto superior direito

#### Desenhar Área Personalizada
- Desenhe polígonos clicando no mapa
- Ideal para áreas agrícolas, propriedades, regiões específicas
- Zoom automático para enquadrar a área desenhada
- Contorno amarelo e máscara aplicados automaticamente

### Seleção de Datas

- **Atualização automática**: As datas são calculadas automaticamente baseadas na data atual
- **8 dias disponíveis**: Hoje + 7 dias seguintes
- **Atualização do mapa**: Ao clicar em uma data, o mapa atualiza automaticamente
- **Cálculo automático**: O campo "Horas à Frente" é atualizado automaticamente

### Camadas Meteorológicas

- **Satélite**: Imagem de satélite em tempo real
- **Nuvens**: Visualização de cobertura de nuvens
- **Radar**: Dados de radar meteorológico
- **Temperatura**: Temperatura do ar em °C
- **Vento**: Velocidade e direção do vento
- **Chuva**: Precipitação prevista
- **Trovão**: Atividade elétrica
- **Chuva e Trovão**: Combinação de precipitação e atividade elétrica

### Visualização de Satélite GOES-19

- **Imagem em tempo real**: Última imagem disponível do satélite GOES-19
- **Crop automático do Brasil**: Foco automático na região brasileira
- **Legenda completa**: 
  - Informações sobre o canal (IR 10.3µm)
  - Escala de temperatura com gradiente de cores
  - Interpretação das cores (nuvens altas, médias, baixas)
  - Data da imagem e data de geração

## 📦 Dependências

A interface web utiliza apenas bibliotecas externas carregadas via CDN:

- **Leaflet 1.4.0**: Biblioteca de mapas
- **Windy Map Forecast API**: API do Windy para previsões
- **html2canvas**: Para captura de screenshots (carregado dinamicamente)

**Não requer instalação de dependências Node.js** - funciona diretamente no navegador!

## ⚙️ Configurações

### Chave API do Windy

A chave API está configurada no código JavaScript:

```javascript
const WINDY_API_KEY = "";
```

**Nota**: Se você tiver sua própria chave API, substitua este valor no arquivo `index.html`.

### Dimensões da Imagem Gerada

- **Tamanho do crop final**: 1200x1200 pixels
- **Zoom padrão (Brasil)**: 4.1
- **Zoom mínimo (cidades/áreas)**: 6
- **Zoom máximo**: 15

## 🎨 Interface

### Layout

- **Cabeçalho**: Título e descrição
- **Controles**: Seleção de camada, horas, cidade e modo
- **Barra de datas**: Botões para seleção de data
- **Mapa**: Área principal de visualização (Windy ou Satélite)
- **Resultado**: Canvas com imagem gerada (quando aplicável)

### Elementos Visuais

- **Status**: Mensagens informativas sobre o estado da aplicação
- **Loading**: Indicador de carregamento durante processamento
- **Instruções**: Guias contextuais para uso das funcionalidades
- **Informações da área**: Estatísticas da área desenhada

## 🔧 Funcionalidades Técnicas

### Desenho de Polígonos

- Sistema de desenho interativo usando Leaflet
- Validação de coordenadas
- Fechamento automático de polígonos
- Cálculo automático de zoom e centro

### Captura de Screenshots

- Usa html2canvas para capturar o mapa Windy
- Processamento de imagem mantendo proporções
- Aplicação de máscaras e contornos
- Geração de imagens em alta qualidade

### Prevenção de Redirecionamentos

- Sistema de proteção contra links do Windy
- MutationObserver para monitorar novos elementos
- Desabilitação de pointer-events em links

## 📝 Notas

- A interface funciona completamente no navegador (client-side)
- Requer conexão com internet para:
  - Carregar mapas do Windy
  - Buscar coordenadas de cidades
  - Buscar limites administrativos
  - Carregar imagens do satélite GOES-19
- As imagens do satélite são atualizadas periodicamente pelo NOAA (não é streaming ao vivo)
- O html2canvas é carregado dinamicamente quando necessário

## 🐛 Troubleshooting

### Mapa não carrega

- Verifique sua conexão com a internet
- Verifique se a chave API do Windy é válida
- Abra o console do navegador (F12) para ver erros

### Área desenhada não aparece

- Certifique-se de ter pelo menos 3 pontos
- Verifique se fechou o polígono (duplo clique ou clique próximo ao primeiro ponto)
- Tente limpar e desenhar novamente

### Imagem do satélite não carrega

- Pode ser problema de CORS (Cross-Origin Resource Sharing)
- Verifique se o servidor NOAA está acessível
- Tente atualizar a página

### Erro ao gerar imagem

- Aguarde o mapa carregar completamente antes de gerar
- Verifique se há área/cidade selecionada (se necessário)
- Verifique o console do navegador para erros específicos

## 🔗 Referências

- [Windy API Documentation](https://api.windy.com/)
- [Leaflet Documentation](https://leafletjs.com/)
- [html2canvas Documentation](https://html2canvas.hertzen.com/)
- [GOES-19 Satellite Data](https://www.star.nesdis.noaa.gov/GOES/)
- [OpenStreetMap Nominatim](https://nominatim.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)

## 📄 Licença

Esta interface web é parte do projeto agroclima.
