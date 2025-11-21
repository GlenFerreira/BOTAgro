// Carrega variáveis de ambiente do .env da raiz
// O .env da raiz já é carregado pelo index.js, então apenas usa process.env
export default {
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
    OPENWEATHER_BASE_URL: process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'
};

