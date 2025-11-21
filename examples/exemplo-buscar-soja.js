const axios = require('axios')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../modulos/.env') })

// Configuração da API USDA PSD
const api = axios.create({
    baseURL: process.env.USDA_PSD_BASE_URL || 'https://api.fas.usda.gov',
    headers: {
        'X-Api-Key': process.env.USDA_PSD_API_KEY
    }
})

// Códigos possíveis para soja
// 2222000 = Soybeans (soja em grão)
// 0813100 = Soybean Meal (farinha de soja)
const SOJA_CODES = {
    'grain': '2222000',      // Soja em grão
    'meal': '0813100',       // Farinha de soja
    'oil': '4242000'         // Óleo de soja (opcional)
}

const BRASIL_CODE = 'BR'
const ANO_ATUAL = new Date().getFullYear()

async function buscarDadosSoja() {
    try {
        console.log('🌱 Buscando dados da soja...\n')
        console.log(`📋 Configuração:`)
        console.log(`   - País: ${BRASIL_CODE} (Brasil)`)
        console.log(`   - Ano: ${ANO_ATUAL}`)
        console.log(`   - API Key: ${process.env.USDA_PSD_API_KEY?.substring(0, 10)}...`)
        console.log(`   - Base URL: ${process.env.USDA_PSD_BASE_URL || 'https://api.fas.usda.gov'}\n`)

        // Tenta primeiro com soja em grão (2222000)
        let codigoUsado = SOJA_CODES.grain
        let nomeCommodity = 'Soja em Grão'
        
        console.log(`📊 1. Buscando dados da ${nomeCommodity} (código: ${codigoUsado}) no Brasil...`)
        
        let responseBrasil
        try {
            responseBrasil = await api.get(
                `/api/psd/commodity/${codigoUsado}/country/${BRASIL_CODE}/year/${ANO_ATUAL}`
            )
            console.log(`✅ Dados recebidos do Brasil para ${nomeCommodity}:`)
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`⚠️ Código ${codigoUsado} não encontrado, tentando farinha de soja...`)
                codigoUsado = SOJA_CODES.meal
                nomeCommodity = 'Farinha de Soja (Soybean Meal)'
                responseBrasil = await api.get(
                    `/api/psd/commodity/${codigoUsado}/country/${BRASIL_CODE}/year/${ANO_ATUAL}`
                )
                console.log(`✅ Dados recebidos do Brasil para ${nomeCommodity}:`)
            } else {
                throw error
            }
        }
        
        console.log(JSON.stringify(responseBrasil.data, null, 2))
        console.log('\n')

        // 2. Buscar dados globais da soja
        console.log(`🌍 2. Buscando dados globais da ${nomeCommodity}...`)
        const responseGlobal = await api.get(
            `/api/psd/commodity/${codigoUsado}/world/year/${ANO_ATUAL}`
        )
        console.log('✅ Dados globais recebidos:')
        console.log(JSON.stringify(responseGlobal.data, null, 2))
        console.log('\n')

        // 3. Buscar informações sobre datas de atualização
        console.log('📅 3. Buscando informações de atualização...')
        const responseReleases = await api.get(
            `/api/psd/commodity/${codigoUsado}/dataReleaseDates`
        )
        console.log('✅ Datas de atualização:')
        console.log(JSON.stringify(responseReleases.data, null, 2))
        console.log('\n')

        // 4. Processar e exibir dados resumidos
        console.log(`📈 RESUMO DOS DADOS DA SOJA (${nomeCommodity}):`)
        console.log('='.repeat(60))
        
        if (responseBrasil.data && Array.isArray(responseBrasil.data) && responseBrasil.data.length > 0) {
            const dados = processarDados(responseBrasil.data)
            console.log(`\n🇧🇷 BRASIL (${ANO_ATUAL}):`)
            
            if (dados.producao) {
                console.log(`   📈 Produção: ${dados.producao}`)
            }
            if (dados.exportacao) {
                console.log(`   🌍 Exportação: ${dados.exportacao}`)
            }
            if (dados.importacao) {
                console.log(`   📥 Importação: ${dados.importacao}`)
            }
            if (dados.estoqueFinal) {
                console.log(`   📦 Estoque Final: ${dados.estoqueFinal}`)
            }
            if (dados.areaPlantada) {
                console.log(`   🌱 Área Plantada: ${dados.areaPlantada}`)
            }
            if (dados.consumo) {
                console.log(`   🔄 Consumo Total: ${dados.consumo}`)
            }
            if (dados.processamento) {
                console.log(`   ⚙️ Processamento (Crush): ${dados.processamento}`)
            }
            if (dados.consumoDomestico) {
                console.log(`   🏠 Consumo Doméstico: ${dados.consumoDomestico}`)
            }
            if (dados.ofertaTotal) {
                console.log(`   📊 Oferta Total: ${dados.ofertaTotal}`)
            }
            if (dados.usoTotal) {
                console.log(`   📊 Uso Total: ${dados.usoTotal}`)
            }
        } else {
            console.log('\n⚠️ Nenhum dado encontrado no array de resposta')
        }

        console.log('\n✅ Busca concluída com sucesso!')
        console.log(`\n💡 Código usado: ${codigoUsado} (${nomeCommodity})`)

    } catch (error) {
        console.error('❌ Erro ao buscar dados da soja:')
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Mensagem:`, JSON.stringify(error.response.data, null, 2))
        } else if (error.request) {
            console.error('   Erro de conexão - nenhuma resposta recebida')
        } else {
            console.error(`   Erro: ${error.message}`)
        }
    }
}

// Função auxiliar para processar os dados recebidos
function processarDados(dataArray) {
    const dados = {}
    
    // Mapear atributos comuns da USDA PSD
    dataArray.forEach(item => {
        switch (item.attributeId) {
            case 4: // Production
                dados.producao = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 20: // Exports
                dados.exportacao = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 28: // Ending Stocks
                dados.estoqueFinal = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 57: // Area Planted
                dados.areaPlantada = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil hectares`
                break
            case 86: // Total Consumption
                dados.consumo = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 88: // Imports
                dados.importacao = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 125: // Crush (Processamento) / Domestic Consumption
                dados.processamento = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                dados.consumoDomestico = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 176: // Total Supply
                dados.ofertaTotal = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
            case 178: // Total Use
                dados.usoTotal = `${item.value?.toLocaleString('pt-BR') || 'N/A'} mil toneladas`
                break
        }
    })
    
    return dados
}

// Executar o script
buscarDadosSoja()
