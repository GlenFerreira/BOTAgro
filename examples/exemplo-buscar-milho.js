const axios = require('axios')
const config = require('./config')

// Configuração da API USDA PSD
const api = axios.create({
    baseURL: config.USDA_PSD_BASE_URL,
    headers: {
        'X-Api-Key': config.USDA_PSD_API_KEY
    }
})

// Código da commodity do milho
const MILHO_CODE = '0440000'
const BRASIL_CODE = 'BR'
const ANO_ATUAL = new Date().getFullYear()

async function buscarDadosMilho() {
    try {
        console.log('🌽 Buscando dados do milho...\n')
        console.log(`📋 Configuração:`)
        console.log(`   - Commodity Code: ${MILHO_CODE}`)
        console.log(`   - País: ${BRASIL_CODE} (Brasil)`)
        console.log(`   - Ano: ${ANO_ATUAL}`)
        console.log(`   - API Key: ${config.USDA_PSD_API_KEY.substring(0, 10)}...`)
        console.log(`   - Base URL: ${config.USDA_PSD_BASE_URL}\n`)

        // 1. Buscar dados do milho no Brasil para o ano atual
        console.log('📊 1. Buscando dados do milho no Brasil...')
        const responseBrasil = await api.get(
            `/api/psd/commodity/${MILHO_CODE}/country/${BRASIL_CODE}/year/${ANO_ATUAL}`
        )
        console.log('✅ Dados recebidos do Brasil:')
        console.log(JSON.stringify(responseBrasil.data, null, 2))
        console.log('\n')

        // 2. Buscar dados globais do milho
        console.log('🌍 2. Buscando dados globais do milho...')
        const responseGlobal = await api.get(
            `/api/psd/commodity/${MILHO_CODE}/world/year/${ANO_ATUAL}`
        )
        console.log('✅ Dados globais recebidos:')
        console.log(JSON.stringify(responseGlobal.data, null, 2))
        console.log('\n')

        // 3. Buscar informações sobre datas de atualização
        console.log('📅 3. Buscando informações de atualização...')
        const responseReleases = await api.get(
            `/api/psd/commodity/${MILHO_CODE}/dataReleaseDates`
        )
        console.log('✅ Datas de atualização:')
        console.log(JSON.stringify(responseReleases.data, null, 2))
        console.log('\n')

        // 4. Processar e exibir dados resumidos
        console.log('📈 RESUMO DOS DADOS DO MILHO:')
        console.log('='.repeat(50))
        
        if (responseBrasil.data && Array.isArray(responseBrasil.data)) {
            const dados = processarDados(responseBrasil.data)
            console.log(`\n🇧🇷 BRASIL (${ANO_ATUAL}):`)
            console.log(`   📈 Produção: ${dados.producao || 'N/A'}`)
            console.log(`   🌍 Exportação: ${dados.exportacao || 'N/A'}`)
            console.log(`   📥 Importação: ${dados.importacao || 'N/A'}`)
            console.log(`   📦 Estoque Final: ${dados.estoqueFinal || 'N/A'}`)
            console.log(`   🔄 Consumo: ${dados.consumo || 'N/A'}`)
        }

        console.log('\n✅ Busca concluída com sucesso!')

    } catch (error) {
        console.error('❌ Erro ao buscar dados do milho:')
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Mensagem: ${error.response.data}`)
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
        }
    })
    
    return dados
}

// Executar o script
buscarDadosMilho()

