import psdService from './psdService.js';
import { normalizarTextoComIA } from '../utils/textNormalizer.js';

// Mapeamento de nomes de commodities para códigos da API USDA
const COMMODITY_MAP = {
    'milho': '0440000', // Corn
    'soja': '2222000',  // Soybeans (soja em grão) - corrigido
    'soja_grain': '2222000', // Soja em grão
    'soja_meal': '0813100',  // Farinha de soja (Soybean Meal)
    'trigo': '0410000', // Wheat
    'cafe': '0411100',  // Coffee
    'café': '0411100',  // Coffee (com acento)
    'algodao': '0422000', // Cotton
    'algodão': '0422000', // Cotton (com acento)
    'acucar': '0416000',  // Sugar
    'açúcar': '0416000',  // Sugar (com acento)
    'arroz': '0443000',  // Rice
};

// Mapeamento de attributeId para nomes de campos
const ATTRIBUTE_MAP = {
    4: 'production',      // Production
    20: 'exports',        // Exports
    28: 'endingStocks',   // Ending Stocks
    57: 'areaPlanted',   // Area Planted
    86: 'domesticConsumption', // Total Consumption
    88: 'imports',        // Imports
    125: 'crush',         // Crush (Processamento) / Domestic Consumption
    176: 'totalSupply',   // Total Supply
    178: 'totalUse',       // Total Use
};

// Palavras-chave que indicam pergunta sobre dados de commodities
const COMMODITY_KEYWORDS = [
    'dados', 'dado', 'informação', 'informacoes', 'informações',
    'preço', 'preco', 'preços', 'precos',
    'produção', 'producao', 'produções', 'producoes',
    'exportação', 'exportacao', 'exportações', 'exportacoes',
    'importação', 'importacao', 'importações', 'importacoes',
    'estoque', 'estoques',
    'área plantada', 'area plantada',
    'consumo', 'consumos',
    'estatística', 'estatistica', 'estatísticas', 'estatisticas',
    'número', 'numero', 'números', 'numeros',
    'valor', 'valores',
    'quanto', 'quantos', 'quantas',
    'qual', 'quais'
];

/**
 * Detecta se a mensagem é uma pergunta sobre dados de commodities
 */
export function detectCommodityIntent(mensagem) {
    const mensagemLower = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Verifica se contém palavras-chave de commodities
    const hasCommodity = Object.keys(COMMODITY_MAP).some(commodity => 
        mensagemLower.includes(commodity)
    );
    
    // Verifica se contém palavras-chave de dados
    const hasDataKeywords = COMMODITY_KEYWORDS.some(keyword => 
        mensagemLower.includes(keyword)
    );
    
    return hasCommodity && hasDataKeywords;
}

/**
 * Extrai o nome da commodity da mensagem
 */
export async function extractCommodityName(mensagem) {
    const mensagemLower = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Para soja, tenta primeiro o código de grão, se não encontrar dados, tenta farinha
    if (mensagemLower.includes('soja') || mensagemLower.includes('sojx')) {
        return { name: 'soja', code: COMMODITY_MAP.soja, alternativeCode: COMMODITY_MAP.soja_meal };
    }
    
    // Tenta encontrar commodity diretamente
    for (const [name, code] of Object.entries(COMMODITY_MAP)) {
        // Ignora variantes específicas na busca principal
        if (name.includes('_')) continue;
        
        if (mensagemLower.includes(name)) {
            return { name, code };
        }
    }
    
    // Se não encontrou, tenta normalizar a mensagem e buscar novamente
    // Extrai possíveis nomes de commodities da mensagem
    const palavras = mensagemLower.split(/\s+/);
    for (const palavra of palavras) {
        if (palavra.length < 3) continue; // Ignora palavras muito curtas
        
        // Normaliza a palavra usando IA
        const palavraNormalizada = await normalizarTextoComIA(palavra, 'commodity');
        const palavraNormalizadaLower = palavraNormalizada.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Busca novamente com a palavra normalizada
        for (const [name, code] of Object.entries(COMMODITY_MAP)) {
            if (name.includes('_')) continue;
            
            const nameLower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (palavraNormalizadaLower.includes(nameLower) || nameLower.includes(palavraNormalizadaLower)) {
                return { name, code };
            }
        }
    }
    
    return null;
}

/**
 * Processa o array de dados da API USDA e extrai os valores por attributeId
 */
function processarDadosArray(dataArray) {
    const dados = {};
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return dados;
    }
    
    // Mapear atributos comuns da USDA PSD baseado no attributeId
    dataArray.forEach(item => {
        const attributeId = item.attributeId;
        const fieldName = ATTRIBUTE_MAP[attributeId];
        
        if (fieldName && item.value !== undefined && item.value !== null) {
            dados[fieldName] = item.value;
        }
    });
    
    return dados;
}

/**
 * Formata os dados da commodity para exibição
 */
function formatCommodityData(data, commodityName) {
    const nomeFormatado = commodityName.charAt(0).toUpperCase() + commodityName.slice(1);
    const anoAtual = new Date().getFullYear();
    
    let dadosProcessados = {};
    let ano = anoAtual;
    
    // A API retorna um array de objetos com attributeId e value
    if (Array.isArray(data) && data.length > 0) {
        dadosProcessados = processarDadosArray(data);
        
        // Tenta extrair o ano do primeiro item se disponível
        if (data[0].marketYear) {
            ano = data[0].marketYear;
        }
    } else if (data && typeof data === 'object') {
        // Se for objeto, tenta processar diretamente
        dadosProcessados = data;
        ano = data.marketYear || data.year || anoAtual;
    } else {
        return `❌ Não foi possível processar os dados recebidos da API.`;
    }
    
    // Formata a data de atualização
    const dataAtualizacao = new Date().toLocaleDateString('pt-BR');
    
    let resposta = `📊 Dados da ${nomeFormatado}\n\n`;
    resposta += `🌾 ${nomeFormatado}\n`;
    resposta += `📅 Ano: ${ano}\n`;
    
    // Extrai os valores processados
    const production = dadosProcessados.production;
    const exports = dadosProcessados.exports;
    const endingStocks = dadosProcessados.endingStocks;
    const areaPlanted = dadosProcessados.areaPlanted;
    const domesticConsumption = dadosProcessados.domesticConsumption;
    const imports = dadosProcessados.imports;
    const crush = dadosProcessados.crush;
    const totalSupply = dadosProcessados.totalSupply;
    const totalUse = dadosProcessados.totalUse;
    
    if (production !== undefined && production !== null) {
        resposta += `📈 Produção: ${formatNumber(production)} mil toneladas\n`;
    }
    
    if (exports !== undefined && exports !== null) {
        resposta += `🌍 Exportação: ${formatNumber(exports)} mil toneladas\n`;
    }
    
    if (endingStocks !== undefined && endingStocks !== null) {
        resposta += `📦 Estoque Final: ${formatNumber(endingStocks)} mil toneladas\n`;
    }
    
    if (areaPlanted !== undefined && areaPlanted !== null) {
        resposta += `🌱 Área Plantada: ${formatNumber(areaPlanted)} mil hectares\n`;
    }
    
    if (domesticConsumption !== undefined && domesticConsumption !== null) {
        resposta += `🔄 Consumo: ${formatNumber(domesticConsumption)} mil toneladas\n`;
    }
    
    if (imports !== undefined && imports !== null) {
        resposta += `📊 Importação: ${formatNumber(imports)} mil toneladas\n`;
    }
    
    // Campos adicionais para soja
    if (crush !== undefined && crush !== null) {
        resposta += `⚙️ Processamento (Crush): ${formatNumber(crush)} mil toneladas\n`;
    }
    
    if (totalSupply !== undefined && totalSupply !== null) {
        resposta += `📊 Oferta Total: ${formatNumber(totalSupply)} mil toneladas\n`;
    }
    
    if (totalUse !== undefined && totalUse !== null) {
        resposta += `📊 Uso Total: ${formatNumber(totalUse)} mil toneladas\n`;
    }
    
    resposta += `\n⏰ Atualizado em: ${dataAtualizacao}\n`;
    resposta += `📊 Fonte: USDA PSD Database`;
    
    return resposta;
}

/**
 * Formata números grandes
 */
function formatNumber(num) {
    if (!num) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    }).format(num);
}

/**
 * Busca dados da commodity e retorna formatado
 */
export async function getCommodityData(mensagem) {
    try {
        const commodity = await extractCommodityName(mensagem);
        
        if (!commodity) {
            return null;
        }
        
        const anoAtual = new Date().getFullYear();
        
        // Tenta buscar dados do Brasil primeiro, testando vários anos
        let dados = null;
        const anosParaTestar = [anoAtual, anoAtual - 1, anoAtual - 2];
        
        // Para soja, tenta primeiro o código principal, depois o alternativo se houver
        const codigosParaTestar = commodity.alternativeCode 
            ? [commodity.code, commodity.alternativeCode]
            : [commodity.code];
        
        // Tenta dados do Brasil para diferentes anos e códigos
        for (const codigo of codigosParaTestar) {
            for (const ano of anosParaTestar) {
                try {
                    dados = await psdService.getBrazilCommodityData(codigo, ano);
                    
                    // Verifica se retornou dados válidos (não array vazio)
                    if (dados && Array.isArray(dados) && dados.length > 0) {
                        commodity.code = codigo;
                        break;
                    } else if (dados && !Array.isArray(dados) && Object.keys(dados).length > 0) {
                        commodity.code = codigo;
                        break;
                    } else {
                        dados = null;
                    }
                } catch (error) {
                    dados = null;
                }
            }
            if (dados && ((Array.isArray(dados) && dados.length > 0) || (!Array.isArray(dados) && Object.keys(dados).length > 0))) {
                break; // Se encontrou dados, para de tentar outros códigos
            }
        }
        
        // Se não encontrou dados do Brasil, tenta dados globais
        if (!dados || (Array.isArray(dados) && dados.length === 0)) {
            for (const ano of anosParaTestar) {
                try {
                    dados = await psdService.getWorldCommodityData(commodity.code, ano);
                    
                    if (dados && Array.isArray(dados) && dados.length > 0) {
                        break;
                    } else if (dados && !Array.isArray(dados) && Object.keys(dados).length > 0) {
                        break;
                    } else {
                        dados = null;
                    }
                } catch (error2) {
                    dados = null;
                }
            }
        }
        
        // Se ainda não encontrou dados, retorna erro
        if (!dados || (Array.isArray(dados) && dados.length === 0) || (typeof dados === 'object' && Object.keys(dados).length === 0)) {
            // Tenta verificar se a API está funcionando listando commodities
            let apiStatus = 'desconhecido';
            try {
                await psdService.getCommodities();
                apiStatus = 'funcionando';
            } catch (error) {
                if (error.response?.status === 404) {
                    apiStatus = 'endpoint_nao_encontrado';
                } else if (error.response?.status === 401) {
                    apiStatus = 'nao_autorizado';
                } else {
                    apiStatus = 'erro';
                }
            }
            
            let mensagemErro = `❌ Não foi possível encontrar dados atualizados para ${commodity.name}.\n\n`;
            
            if (apiStatus === 'endpoint_nao_encontrado') {
                mensagemErro += `⚠️ A API USDA parece não estar disponível no formato esperado.\n`;
                mensagemErro += `💡 A estrutura da API pode ter mudado ou não estar acessível publicamente.\n\n`;
                mensagemErro += `📝 Sugestões:\n`;
                mensagemErro += `- Verifique a documentação oficial da API USDA\n`;
                mensagemErro += `- Confirme se a chave da API está correta\n`;
                mensagemErro += `- Verifique se o endpoint está correto\n`;
            } else if (apiStatus === 'nao_autorizado') {
                mensagemErro += `⚠️ Problema de autenticação com a API USDA.\n`;
                mensagemErro += `💡 Verifique se a chave da API está correta e válida.\n`;
            } else {
                mensagemErro += `💡 Possíveis causas:\n`;
                mensagemErro += `- Dados ainda não disponíveis para o ano solicitado\n`;
                mensagemErro += `- Código da commodity pode estar incorreto\n`;
                mensagemErro += `- API pode estar temporariamente indisponível\n`;
            }
            
            mensagemErro += `\nTente perguntar sobre outra commodity ou aguarde alguns instantes.`;
            
            return mensagemErro;
        }
        
        return formatCommodityData(dados, commodity.name);
        
    } catch (error) {
        console.error(`❌ Erro ao buscar dados da commodity: ${error.message}`);
        return `❌ Desculpe, ocorreu um erro ao buscar os dados. Tente novamente mais tarde.`;
    }
}


