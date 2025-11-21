const axios = require('axios')

// Configuração da API Open-Meteo (gratuita, não precisa de API key)
const BASE_URL = 'https://api.open-meteo.com/v1'

// Mapeamento de cidades brasileiras para coordenadas
const CIDADES = {
    'sao paulo': { lat: -23.5505, lon: -46.6333, nome: 'São Paulo' },
    'rio de janeiro': { lat: -22.9068, lon: -43.1729, nome: 'Rio de Janeiro' },
    'belo horizonte': { lat: -19.9167, lon: -43.9345, nome: 'Belo Horizonte' },
    'brasilia': { lat: -15.7801, lon: -47.9292, nome: 'Brasília' },
    'salvador': { lat: -12.9714, lon: -38.5014, nome: 'Salvador' },
    'fortaleza': { lat: -3.7319, lon: -38.5267, nome: 'Fortaleza' },
    'manaus': { lat: -3.1190, lon: -60.0217, nome: 'Manaus' },
    'curitiba': { lat: -25.4244, lon: -49.2654, nome: 'Curitiba' },
    'recife': { lat: -8.0476, lon: -34.8770, nome: 'Recife' },
    'porto alegre': { lat: -30.0346, lon: -51.2177, nome: 'Porto Alegre' },
    'sp': { lat: -23.5505, lon: -46.6333, nome: 'São Paulo' },
    'rj': { lat: -22.9068, lon: -43.1729, nome: 'Rio de Janeiro' },
    'bh': { lat: -19.9167, lon: -43.9345, nome: 'Belo Horizonte' },
    'df': { lat: -15.7801, lon: -47.9292, nome: 'Brasília' }
}

// Normalizar nome da cidade
function normalizarCidade(cidade) {
    return cidade
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .trim()
}

// Converter código do tempo em descrição
function getDescricaoClima(codigo) {
    const codigos = {
        0: 'céu limpo',
        1: 'principalmente limpo',
        2: 'parcialmente nublado',
        3: 'nublado',
        45: 'névoa',
        48: 'névoa com geada',
        51: 'chuva leve',
        53: 'chuva moderada',
        55: 'chuva forte',
        61: 'chuva leve',
        63: 'chuva moderada',
        65: 'chuva forte',
        71: 'neve leve',
        73: 'neve moderada',
        75: 'neve forte',
        77: 'grãos de neve',
        80: 'chuva leve',
        81: 'chuva moderada',
        82: 'chuva forte',
        85: 'neve leve',
        86: 'neve forte',
        95: 'tempestade',
        96: 'tempestade com granizo',
        99: 'tempestade forte com granizo'
    }
    return codigos[codigo] || 'condições desconhecidas'
}

// Obter nome do dia da semana
function getNomeDia(data) {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return dias[new Date(data).getDay()]
}

async function buscarClima(cidade) {
    try {
        // Normalizar nome da cidade
        const cidadeNormalizada = normalizarCidade(cidade)
        const coordenadas = CIDADES[cidadeNormalizada]

        if (!coordenadas) {
            console.error(`❌ Cidade "${cidade}" não encontrada.`)
            console.log('\n📋 Cidades disponíveis:')
            Object.keys(CIDADES).forEach(key => {
                if (!['sp', 'rj', 'bh', 'df'].includes(key)) {
                    console.log(`   - ${CIDADES[key].nome}`)
                }
            })
            return
        }

        console.log(`🌤️ Buscando dados do clima para ${coordenadas.nome}...\n`)
        console.log(`📋 Configuração:`)
        console.log(`   - Cidade: ${coordenadas.nome}`)
        console.log(`   - Latitude: ${coordenadas.lat}`)
        console.log(`   - Longitude: ${coordenadas.lon}`)
        console.log(`   - API: Open-Meteo (gratuita)\n`)

        // Buscar dados de previsão
        console.log('📊 Buscando dados de previsão do tempo...')
        const response = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                latitude: coordenadas.lat,
                longitude: coordenadas.lon,
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
                timezone: 'America/Sao_Paulo',
                forecast_days: 5
            }
        })

        console.log('✅ Dados recebidos com sucesso!\n')
        console.log('📄 Resposta completa da API:')
        console.log(JSON.stringify(response.data, null, 2))
        console.log('\n')

        // Processar e exibir dados formatados
        const dados = response.data.daily
        const temperaturaAtual = Math.round((dados.temperature_2m_max[0] + dados.temperature_2m_min[0]) / 2)
        const condicaoAtual = getDescricaoClima(dados.weather_code[0])

        console.log('='.repeat(60))
        console.log(`🌤️ CLIMA EM ${coordenadas.nome.toUpperCase()}`)
        console.log('='.repeat(60))
        console.log(`\n🌡️ AGORA:`)
        console.log(`   Temperatura: ${temperaturaAtual}°C`)
        console.log(`   Máxima: ${dados.temperature_2m_max[0]}°C`)
        console.log(`   Mínima: ${dados.temperature_2m_min[0]}°C`)
        console.log(`   Condição: ${condicaoAtual}`)
        console.log(`   Precipitação: ${dados.precipitation_sum[0] || 0} mm\n`)

        console.log('📅 PREVISÃO PARA OS PRÓXIMOS 5 DIAS:')
        console.log('-'.repeat(60))
        
        for (let i = 0; i < Math.min(dados.time.length, 5); i++) {
            const data = dados.time[i]
            const dia = i === 0 ? 'Hoje' : getNomeDia(data)
            const max = dados.temperature_2m_max[i]
            const min = dados.temperature_2m_min[i]
            const chuva = dados.precipitation_sum[i] || 0
            const condicao = getDescricaoClima(dados.weather_code[i])

            console.log(`\n🗓️ ${dia} (${data}):`)
            console.log(`   🌡️ Temperatura: ${min}°C / ${max}°C`)
            console.log(`   ☁️ Condição: ${condicao}`)
            console.log(`   💧 Precipitação: ${chuva} mm`)
        }

        // Gerar alertas agrícolas
        console.log('\n' + '='.repeat(60))
        console.log('⚠️ ALERTAS AGRÍCOLAS:')
        console.log('='.repeat(60))
        
        const alertas = []
        for (let i = 0; i < Math.min(dados.time.length, 5); i++) {
            const dia = i === 0 ? 'Hoje' : getNomeDia(dados.time[i])
            const max = dados.temperature_2m_max[i]
            const min = dados.temperature_2m_min[i]
            const chuva = dados.precipitation_sum[i] || 0
            const condicao = getDescricaoClima(dados.weather_code[i])

            // Alerta de chuva forte
            if (condicao.includes('chuva forte') || condicao.includes('tempestade')) {
                alertas.push(`⚠️ ${dia}: Chuva forte prevista - Evitar aplicação de defensivos`)
            }

            // Alerta de calor extremo
            if (max > 35) {
                alertas.push(`🌡️ ${dia}: Calor extremo (${max}°C) - Aumentar irrigação`)
            }

            // Alerta de geada
            if (min < 5) {
                alertas.push(`❄️ ${dia}: Risco de geada (${min}°C) - Proteger plantações`)
            }

            // Alerta de seca
            if (chuva === 0 && max > 30) {
                alertas.push(`🌵 ${dia}: Sem chuva e calor - Atenção à irrigação`)
            }
        }

        if (alertas.length > 0) {
            alertas.slice(0, 5).forEach(alerta => {
                console.log(`   ${alerta}`)
            })
        } else {
            console.log('   ✅ Nenhum alerta no momento')
        }

        console.log('\n📊 Fonte: Open-Meteo (ECMWF/NOAA)')
        console.log('✅ Busca concluída com sucesso!')

    } catch (error) {
        console.error('❌ Erro ao buscar dados do clima:')
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Mensagem: ${JSON.stringify(error.response.data, null, 2)}`)
        } else if (error.request) {
            console.error('   Erro de conexão - nenhuma resposta recebida')
            console.error(`   Detalhes: ${error.message}`)
        } else {
            console.error(`   Erro: ${error.message}`)
        }
    }
}

// Executar o script
// Você pode passar a cidade como argumento: node exemplo-buscar-clima.js "São Paulo"
const cidade = process.argv[2] || 'São Paulo'
buscarClima(cidade)

