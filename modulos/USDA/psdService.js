import axios from 'axios';
import config from './config.js';

const api = axios.create({
    baseURL: config.USDA_PSD_BASE_URL,
    headers: {
        'X-Api-Key': config.USDA_PSD_API_KEY
    }
});

const psdService = {
    // Listar todas as commodities disponíveis
    async getCommodities() {
        const response = await api.get('/api/psd/commodities');
        return response.data;
    },

    // Buscar dados de uma commodity específica por país e ano
    async getCommodityData(commodityCode, countryCode, marketYear) {
        const response = await api.get(`/api/psd/commodity/${commodityCode}/country/${countryCode}/year/${marketYear}`);
        return response.data;
    },

    // Buscar dados globais de uma commodity por ano
    async getWorldCommodityData(commodityCode, marketYear) {
        const response = await api.get(`/api/psd/commodity/${commodityCode}/world/year/${marketYear}`);
        return response.data;
    },

    // Buscar dados do Brasil (código BR) de uma commodity por ano
    async getBrazilCommodityData(commodityCode, marketYear) {
        try {
            const url = `/api/psd/commodity/${commodityCode}/country/BR/year/${marketYear}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                // Silencioso para 404, é esperado em alguns casos
            }
            throw error;
        }
    },

    // Buscar datas de atualização dos dados
    async getDataReleaseInfo(commodityCode) {
        const response = await api.get(`/api/psd/commodity/${commodityCode}/dataReleaseDates`);
        return response.data;
    },

    // Listar regiões
    async getRegions() {
        const response = await api.get('/api/psd/regions');
        return response.data;
    },

    // Listar países
    async getCountries() {
        const response = await api.get('/api/psd/countries');
        return response.data;
    }
};

export default psdService;
