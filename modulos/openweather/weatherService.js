import axios from 'axios';
import config from './config.js';

const api = axios.create({
    baseURL: config.OPENWEATHER_BASE_URL,
    params: {
        appid: config.OPENWEATHER_API_KEY,
        units: 'metric', // Temperatura em Celsius
        lang: 'pt_br' // Respostas em português
    }
});

const weatherService = {
    // Buscar previsão do tempo para 5 dias (3 horas por intervalo)
    async get5DayForecast(cityName) {
        try {
            // Primeiro, buscar coordenadas da cidade
            const geocodeResponse = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
                params: {
                    q: cityName,
                    limit: 1,
                    appid: config.OPENWEATHER_API_KEY
                }
            });

            if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
                throw new Error(`Cidade "${cityName}" não encontrada`);
            }

            const city = geocodeResponse.data[0];
            const { lat, lon } = city;

            // Buscar previsão de 5 dias
            const forecastResponse = await api.get('/forecast', {
                params: {
                    lat,
                    lon
                }
            });

            return {
                city: {
                    name: city.name,
                    country: city.country,
                    state: city.state || null,
                    lat,
                    lon
                },
                forecast: forecastResponse.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar previsão do tempo:', error.response?.data || error.message);
            throw error;
        }
    },

    // Buscar clima atual
    async getCurrentWeather(cityName) {
        try {
            const geocodeResponse = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
                params: {
                    q: cityName,
                    limit: 1,
                    appid: config.OPENWEATHER_API_KEY
                }
            });

            if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
                throw new Error(`Cidade "${cityName}" não encontrada`);
            }

            const city = geocodeResponse.data[0];
            const { lat, lon } = city;

            const weatherResponse = await api.get('/weather', {
                params: {
                    lat,
                    lon
                }
            });

            return {
                city: {
                    name: city.name,
                    country: city.country,
                    state: city.state || null,
                    lat,
                    lon
                },
                weather: weatherResponse.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar clima atual:', error.response?.data || error.message);
            throw error;
        }
    }
};

export default weatherService;

