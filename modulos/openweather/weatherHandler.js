import weatherService from './weatherService.js';
import { normalizarTextoComIA } from '../utils/textNormalizer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Palavras-chave que indicam pergunta sobre clima
const WEATHER_KEYWORDS = [
    'clima', 'tempo', 'temperatura', 'previsão', 'previsao',
    'chuva', 'sol', 'nublado', 'vento', 'umidade',
    'qual o clima', 'como está o clima', 'como esta o clima',
    'previsão do tempo', 'previsao do tempo', 'previsão tempo', 'previsao tempo',
    'previsão de tempo', 'previsao de tempo', 'previsão para', 'previsao para',
    'tempo em', 'clima em', 'temperatura em', 'tempo para', 'clima para'
];

// Mapeamento de ícones do OpenWeather para emojis
const WEATHER_ICONS = {
    '01d': '☀️', // céu limpo (dia)
    '01n': '🌙', // céu limpo (noite)
    '02d': '⛅', // poucas nuvens (dia)
    '02n': '☁️', // poucas nuvens (noite)
    '03d': '☁️', // nuvens dispersas
    '03n': '☁️',
    '04d': '☁️', // nuvens quebradas
    '04n': '☁️',
    '09d': '🌧️', // chuva
    '09n': '🌧️',
    '10d': '🌦️', // chuva com sol
    '10n': '🌧️', // chuva (noite)
    '11d': '⛈️', // tempestade
    '11n': '⛈️',
    '13d': '❄️', // neve
    '13n': '❄️',
    '50d': '🌫️', // névoa
    '50n': '🌫️'
};

/**
 * Detecta se a mensagem é uma pergunta sobre clima
 */
export function detectWeatherIntent(mensagem) {
    const mensagemLower = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return WEATHER_KEYWORDS.some(keyword => mensagemLower.includes(keyword));
}

/**
 * Extrai o nome da cidade da mensagem
 */
export function extractCityName(mensagem) {
    // Padrões comuns para perguntas sobre clima
    const patterns = [
        /(?:clima|tempo|temperatura|previsão|previsao)\s+(?:em|de|do|da|na|no|para)\s+([^?.,!]+)/i,
        /(?:qual|como)\s+(?:o|a)\s+(?:clima|tempo|temperatura|previsão|previsao)\s+(?:em|de|do|da|na|no|para)\s+([^?.,!]+)/i,
        /(?:previsão|previsao)\s+(?:de|do)\s+(?:tempo|clima)\s+(?:para|em|de|do|da|na|no)\s+([^?.,!]+)/i,
        /(?:em|de|do|da|na|no|para)\s+([^?.,!]+)\s+(?:o|a)\s+(?:clima|tempo|temperatura)/i
    ];

    for (const pattern of patterns) {
        const match = mensagem.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    // Se não encontrou padrão, tenta pegar a última palavra (pode ser o nome da cidade)
    const words = mensagem.split(/\s+/);
    if (words.length > 2) {
        // Pega as últimas 2-3 palavras (para cidades com nomes compostos)
        return words.slice(-2).join(' ').replace(/[?.,!]/g, '').trim();
    }

    return null;
}

/**
 * Verifica se existe imagem para a cidade
 */
function getCityImagePath(cityName) {
    // Normalizar nome da cidade para nome de arquivo
    const normalizedName = cityName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '') // Remove espaços
        .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
        .toLowerCase();
    
    // Verificar em todas as pastas de imagens
    const imageFolders = ['imgrain', 'imgtemp', 'imgwind', 'imgcloud', 'imgsat', 'imgradar', 'imgthund', 'imgrt'];
    const climaDir = path.join(__dirname, '../clima');
    
    // Procurar por qualquer imagem da cidade (qualquer camada, 24h)
    for (const folder of imageFolders) {
        const folderPath = path.join(climaDir, folder);
        if (fs.existsSync(folderPath)) {
            // Listar arquivos na pasta e procurar por arquivos que começam com o nome da cidade
            const files = fs.readdirSync(folderPath);
            const cityImage = files.find(file => 
                file.startsWith(normalizedName) && 
                file.endsWith('_24h.png')
            );
            
            if (cityImage) {
                return path.join(folderPath, cityImage);
            }
        }
    }
    
    return null;
}

/**
 * Formata a previsão do tempo para 5 dias
 */
function format5DayForecast(data, hasImage = false) {
    const { city, forecast } = data;
    
    // Agrupar por dia (pegar previsão de cada dia às 12h ou a mais próxima)
    const dailyForecasts = {};
    
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const hour = date.getHours();
        
        // Preferir previsões ao meio-dia (12h), senão pegar a primeira do dia
        if (!dailyForecasts[dateKey] || hour === 12 || (hour >= 9 && hour <= 15)) {
            dailyForecasts[dateKey] = item;
        }
    });

    // Ordenar por data
    const sortedDates = Object.keys(dailyForecasts).sort((a, b) => {
        const [dayA, monthA] = a.split('/');
        const [dayB, monthB] = b.split('/');
        return new Date(2024, monthA - 1, dayA) - new Date(2024, monthB - 1, dayB);
    });

    let resposta = '';
    
    // Se tiver imagem, adiciona o texto especial
    if (hasImage) {
        resposta += `🌤️Acima a previsão das proximas 24 horas\n`;
        resposta += `Nos proximos 5 dias:\n\n`;
    } else {
        resposta += `🌤️ Previsão do Tempo - ${city.name}`;
        if (city.state) {
            resposta += `, ${city.state}`;
        }
        resposta += `\n\n`;
    }

    sortedDates.slice(0, 5).forEach((dateKey, index) => {
        const item = dailyForecasts[dateKey];
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayNumber = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'long' });
        
        const icon = WEATHER_ICONS[item.weather[0].icon] || '🌤️';
        const description = item.weather[0].description;
        const temp = Math.round(item.main.temp);
        const tempMin = Math.round(item.main.temp_min);
        const tempMax = Math.round(item.main.temp_max);
        const humidity = item.main.humidity;
        const windSpeed = Math.round(item.wind.speed * 3.6); // Converter m/s para km/h
        const rain = item.rain ? item.rain['3h'] || 0 : 0;
        
        resposta += `${icon} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNumber} de ${month}\n`;
        resposta += `   ${description.charAt(0).toUpperCase() + description.slice(1)}\n`;
        resposta += `   🌡️ ${temp}°C (máx: ${tempMax}°C | mín: ${tempMin}°C)\n`;
        
        if (rain > 0) {
            resposta += `   🌧️ Chuva: ${rain.toFixed(1)}mm\n`;
        }
        
        resposta += `   💨 Vento: ${windSpeed} km/h\n`;
        resposta += `   💧 Umidade: ${humidity}%\n`;
        
        if (index < sortedDates.length - 1) {
            resposta += `\n`;
        }
    });

    resposta += `\n⏰ Atualizado em: ${new Date().toLocaleDateString('pt-BR')}\n`;
    resposta += `📊 Fonte: OpenWeather Map`;

    return resposta;
}

/**
 * Busca previsão do tempo para 5 dias e retorna formatado
 * Retorna objeto com { message, imagePath } se tiver imagem, ou apenas string se não tiver
 */
export async function getWeatherForecast(mensagem) {
    try {
        let cityName = extractCityName(mensagem);
        
        if (!cityName) {
            return null;
        }

        // Normaliza o nome da cidade usando IA
        cityName = await normalizarTextoComIA(cityName, 'cidade');
        const data = await weatherService.get5DayForecast(cityName);
        
        // Verificar se existe imagem para a cidade (tentar com o nome extraído e com o nome da API)
        let imagePath = getCityImagePath(cityName);
        if (!imagePath) {
            // Tentar também com o nome retornado pela API
            imagePath = getCityImagePath(data.city.name);
        }
        
        const hasImage = imagePath !== null;
        
        const message = format5DayForecast(data, hasImage);
        
        // Se tiver imagem, retorna objeto, senão retorna string
        if (hasImage) {
            return {
                message,
                imagePath
            };
        }
        
        return message;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar previsão do tempo: ${error.message}`);
        
        if (error.response?.status === 404 || error.message.includes('não encontrada')) {
            return `❌ Cidade não encontrada. Verifique se o nome está correto e tente novamente.`;
        } else if (error.response?.status === 401) {
            return `❌ Erro de autenticação com a API OpenWeather. Verifique a chave da API.`;
        } else {
            return `❌ Desculpe, ocorreu um erro ao buscar a previsão do tempo. Tente novamente mais tarde.`;
        }
    }
}

