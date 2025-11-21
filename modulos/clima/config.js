// Carrega variáveis de ambiente do arquivo .env na pasta modulos
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env da pasta modulos
dotenv.config({ path: path.join(__dirname, '../.env') });

export default {
    WINDY_API_KEY: process.env.WINDY_API_KEY || '',
};

