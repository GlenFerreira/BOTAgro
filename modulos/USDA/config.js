// Carrega variáveis de ambiente do arquivo .env na pasta modulos
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env da pasta modulos
dotenv.config({ path: path.join(__dirname, '../.env') });

export default {
    USDA_PSD_API_KEY: process.env.USDA_PSD_API_KEY || '',
    USDA_PSD_BASE_URL: process.env.USDA_PSD_BASE_URL || 'https://api.fas.usda.gov'
};
