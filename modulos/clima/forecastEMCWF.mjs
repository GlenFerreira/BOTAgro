import puppeteer from 'puppeteer';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

// Obter diretório atual do módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chave API do Windy (carregada do .env)
const WINDY_API_KEY = config.WINDY_API_KEY;

// Configurações
const FORECAST_HOURS = parseInt(process.argv[2]) || 24; // Horas à frente (padrão: 24h)
const LAYER = process.argv[3] || 'satellite'; // 'satellite', 'clouds', 'radar', 'temp', 'wind', 'rain', 'thunder', 'rainthunder'
const CITY = process.argv[4] || null; // Nome da cidade (opcional, ex: "São Paulo", "Rio de Janeiro")

// Mapeamento de camadas para pastas
const LAYER_FOLDERS = {
  'satellite': 'imgsat',
  'clouds': 'imgcloud',
  'radar': 'imgradar',
  'temp': 'imgtemp',
  'wind': 'imgwind',
  'rain': 'imgrain',
  'thunder': 'imgthund',
  'rainthunder': 'imgrt'
};

// Limites do crop do Brasil
const minLon = -75; // oeste
const maxLon = -34; // leste
const minLat = -35; // sul
const maxLat = 6;   // norte

// Valores da grade 3x3 (deformação ajustada)
const gridPoints = {
  nw: { x: 78, y: 109 },
  n:  { x: 479, y: 107 },
  ne: { x: 814, y: 116 },
  w:  { x: 74, y: 464 },
  c:  { x: 466, y: 461 },
  e:  { x: 773, y: 443 },
  sw: { x: 122, y: 787 },
  s:  { x: 390, y: 768 },
  se: { x: 728, y: 787 }
};

const cropWidth = 1200; // Aumentado de 800 para melhor qualidade
const cropHeight = 1200; // Aumentado de 800 para melhor qualidade

// Calcular bounding box original do contorno do Brasil
function calculateBoundingBox(geoJson) {
  if (!geoJson || !geoJson.features) return null;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  geoJson.features.forEach(feature => {
    if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ring.forEach(coord => {
            const lon = coord[0];
            const lat = coord[1];
            const [x, y] = projectBase(lon, lat, cropWidth, cropHeight);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          });
        });
      });
    } else if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach(ring => {
        ring.forEach(coord => {
          const lon = coord[0];
          const lat = coord[1];
          const [x, y] = projectBase(lon, lat, cropWidth, cropHeight);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });
      });
    }
  });
  
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

// Projeção base
function projectBase(lon, lat, width, height) {
  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return [x, y];
}

// Transformação usando grade 3x3
function gridTransform(x, y, srcGrid, dstGrid, width, height) {
  const srcNW = srcGrid.nw;
  const srcNE = srcGrid.ne;
  const srcSW = srcGrid.sw;
  const srcSE = srcGrid.se;
  
  const bboxWidth = srcNE.x - srcNW.x;
  const bboxHeight = srcSW.y - srcNW.y;
  
  if (bboxWidth === 0 || bboxHeight === 0) return [x, y];
  
  const u = (x - srcNW.x) / bboxWidth;
  const v = (y - srcNW.y) / bboxHeight;
  
  let quadX, quadY;
  let localU, localV;
  
  if (u < 0.5) {
    quadX = 0;
    localU = u * 2;
  } else {
    quadX = 1;
    localU = (u - 0.5) * 2;
  }
  
  if (v < 0.5) {
    quadY = 0;
    localV = v * 2;
  } else {
    quadY = 1;
    localV = (v - 0.5) * 2;
  }
  
  let srcTL, srcTR, srcBL, srcBR;
  let dstTL, dstTR, dstBL, dstBR;
  
  if (quadX === 0 && quadY === 0) {
    srcTL = srcGrid.nw; srcTR = srcGrid.n; srcBL = srcGrid.w; srcBR = srcGrid.c;
    dstTL = dstGrid.nw; dstTR = dstGrid.n; dstBL = dstGrid.w; dstBR = dstGrid.c;
  } else if (quadX === 1 && quadY === 0) {
    srcTL = srcGrid.n; srcTR = srcGrid.ne; srcBL = srcGrid.c; srcBR = srcGrid.e;
    dstTL = dstGrid.n; dstTR = dstGrid.ne; dstBL = dstGrid.c; dstBR = dstGrid.e;
  } else if (quadX === 0 && quadY === 1) {
    srcTL = srcGrid.w; srcTR = srcGrid.c; srcBL = srcGrid.sw; srcBR = srcGrid.s;
    dstTL = dstGrid.w; dstTR = dstGrid.c; dstBL = dstGrid.sw; dstBR = dstGrid.s;
  } else {
    srcTL = srcGrid.c; srcTR = srcGrid.e; srcBL = srcGrid.s; srcBR = srcGrid.se;
    dstTL = dstGrid.c; dstTR = dstGrid.e; dstBL = dstGrid.s; dstBR = dstGrid.se;
  }
  
  const topX = srcTL.x + (srcTR.x - srcTL.x) * localU;
  const topY = srcTL.y + (srcTR.y - srcTL.y) * localU;
  const bottomX = srcBL.x + (srcBR.x - srcBL.x) * localU;
  const bottomY = srcBL.y + (srcBR.y - srcBL.y) * localU;
  
  const srcFinalX = topX + (bottomX - topX) * localV;
  const srcFinalY = topY + (bottomY - topY) * localV;
  
  const dstTopX = dstTL.x + (dstTR.x - dstTL.x) * localU;
  const dstTopY = dstTL.y + (dstTR.y - dstTL.y) * localU;
  const dstBottomX = dstBL.x + (dstBR.x - dstBL.x) * localU;
  const dstBottomY = dstBL.y + (dstBR.y - dstBL.y) * localU;
  
  const dstFinalX = dstTopX + (dstBottomX - dstTopX) * localV;
  const dstFinalY = dstTopY + (dstBottomY - dstTopY) * localV;
  
  const offsetX = dstFinalX - srcFinalX;
  const offsetY = dstFinalY - srcFinalY;
  
  return [x + offsetX, y + offsetY];
}

function project(lon, lat, bbox, originalGridPoints, width, height) {
  const [baseX, baseY] = projectBase(lon, lat, width, height);
  if (!bbox) return [baseX, baseY];
  return gridTransform(baseX, baseY, originalGridPoints, gridPoints, width, height);
}

// Desenhar contorno do Brasil
function drawBrazilContour(ctx, geoJson, bbox, originalGridPoints, width, height) {
  if (!geoJson || !geoJson.features) return;
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  geoJson.features.forEach(feature => {
    if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ctx.beginPath();
          let firstPoint = true;
          ring.forEach(coord => {
            const lon = coord[0];
            const lat = coord[1];
            const [x, y] = project(lon, lat, bbox, originalGridPoints, width, height);
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      });
    } else if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach(ring => {
        ctx.beginPath();
        let firstPoint = true;
        ring.forEach(coord => {
          const lon = coord[0];
          const lat = coord[1];
          const [x, y] = project(lon, lat, bbox, originalGridPoints, width, height);
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      });
    }
  });
}

// Desenhar contornos dos estados
function drawStates(ctx, statesGeoJson, bbox, originalGridPoints, width, height) {
  if (!statesGeoJson || !statesGeoJson.features) return;
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
  ctx.lineWidth = 1.5;
  statesGeoJson.features.forEach(feature => {
    if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ctx.beginPath();
          let firstPoint = true;
          ring.forEach(coord => {
            const lon = coord[0];
            const lat = coord[1];
            const [x, y] = project(lon, lat, bbox, originalGridPoints, width, height);
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      });
    } else if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach(ring => {
        ctx.beginPath();
        let firstPoint = true;
        ring.forEach(coord => {
          const lon = coord[0];
          const lat = coord[1];
          const [x, y] = project(lon, lat, bbox, originalGridPoints, width, height);
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      });
    }
  });
}

// Buscar coordenadas de uma cidade
async function getCityCoordinates(cityName) {
  // Primeiro, tentar buscar no arquivo de capitais
  try {
    const capitalsPath = path.resolve("../INMET/capitals.json");
    if (fs.existsSync(capitalsPath)) {
      const capitals = JSON.parse(fs.readFileSync(capitalsPath, "utf8"));
      const city = capitals.find(c => 
        c.name.toLowerCase() === cityName.toLowerCase() ||
        c.name.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (city) {
        console.log(`   📍 Cidade encontrada: ${city.name}, ${city.uf}`);
        return { lat: city.lat, lon: city.lon, name: city.name };
      }
    }
  } catch (error) {
    console.warn(`   ⚠️ Erro ao ler arquivo de capitais: ${error.message}`);
  }
  
  // Se não encontrou, tentar API de geocoding (Open-Meteo - gratuita)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log(`   📍 Cidade encontrada: ${result.name}, ${result.country}`);
      return { lat: result.latitude, lon: result.longitude, name: result.name };
    }
  } catch (error) {
    console.warn(`   ⚠️ Erro ao buscar cidade na API: ${error.message}`);
  }
  
  throw new Error(`Cidade "${cityName}" não encontrada`);
}

// Buscar limites administrativos da cidade
async function getCityBoundary(cityName, lat, lon) {
  try {
    // Tentar Overpass API primeiro (mais preciso)
    // Buscar apenas admin_level 8 (cidade) e 9 (bairro), com raio menor
    const overpassQuery = `
      [out:json][timeout:10];
      (
        relation["admin_level"="8"]["boundary"="administrative"](around:3000,${lat},${lon});
        relation["admin_level"="9"]["boundary"="administrative"](around:3000,${lat},${lon});
        way["place"="city"]["name"~"${cityName}",i](around:5000,${lat},${lon});
        way["place"="town"]["name"~"${cityName}",i](around:5000,${lat},${lon});
      );
      out geom;
    `;
    
    const overpassResponse = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
    );
    
    if (overpassResponse.ok) {
      const overpassData = await overpassResponse.json();
      if (overpassData.elements && overpassData.elements.length > 0) {
        // Tentar encontrar o elemento mais próximo e com tamanho razoável
        let bestElement = null;
        let bestScore = Infinity;
        
        for (const element of overpassData.elements) {
          if (element.geometry && element.geometry.length > 0) {
            // Calcular bounding box do elemento
            let minLat = Infinity, maxLat = -Infinity;
            let minLon = Infinity, maxLon = -Infinity;
            
            element.geometry.forEach(coord => {
              minLat = Math.min(minLat, coord.lat);
              maxLat = Math.max(maxLat, coord.lat);
              minLon = Math.min(minLon, coord.lon);
              maxLon = Math.max(maxLon, coord.lon);
            });
            
            // Calcular tamanho da área (em graus)
            const latRange = maxLat - minLat;
            const lonRange = maxLon - minLon;
            const areaSize = latRange * lonRange;
            
            // Preferir áreas menores (cidades) e mais próximas do centro
            const centerElementLat = (minLat + maxLat) / 2;
            const centerElementLon = (minLon + maxLon) / 2;
            const distance = Math.sqrt(
              Math.pow(centerElementLat - lat, 2) + 
              Math.pow(centerElementLon - lon, 2)
            );
            
            // Score: preferir áreas menores e mais próximas
            // Limitar a áreas com no máximo 2 graus de extensão (cidade grande)
            if (latRange < 2 && lonRange < 2) {
              const score = areaSize * 1000 + distance;
              if (score < bestScore) {
                bestScore = score;
                bestElement = element;
              }
            }
          }
        }
        
        if (bestElement && bestElement.geometry) {
          const coordinates = bestElement.geometry.map(coord => [coord.lon, coord.lat]);
          return {
            type: 'Polygon',
            coordinates: [coordinates]
          };
        }
      }
    }
    
    // Se Overpass não funcionar, tentar Nominatim com filtro mais específico
    const searchResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ", Brasil")}&format=json&limit=10&polygon_geojson=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WindyForecastScript/1.0'
        }
      }
    );
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      // Procurar resultado que seja uma cidade (place_type: city ou town) e tenha polígono
      for (const result of searchData) {
        if (result.geojson) {
          // Verificar se é Polygon ou MultiPolygon (não Point)
          if (result.geojson.type === 'Polygon' || result.geojson.type === 'MultiPolygon') {
            // Verificar tamanho do geojson
            try {
              const bounds = calculateGeometryBounds(result.geojson);
              const latRange = bounds.maxLat - bounds.minLat;
              const lonRange = bounds.maxLon - bounds.minLon;
              
              // Aceitar apenas se for razoável (menos de 2 graus) e válido
              if (latRange > 0 && lonRange > 0 && latRange < 2 && lonRange < 2) {
                console.log(`   ✅ Encontrado polígono válido via Nominatim (${result.geojson.type})`);
                return result.geojson;
              }
            } catch (error) {
              // Continuar procurando se este não for válido
              continue;
            }
          }
        }
      }
    }
    
    // Se tudo falhar ou retornar apenas Point, criar um círculo aproximado
    console.log(`   ⚠️ Não foi possível encontrar polígono válido, usando círculo aproximado para ${cityName}`);
    return createApproximateBoundary(lat, lon);
  } catch (error) {
    console.warn(`   ⚠️ Erro ao buscar limites da cidade, usando aproximação: ${error.message}`);
    return createApproximateBoundary(lat, lon);
  }
}

// Criar limite aproximado usando um círculo
function createApproximateBoundary(lat, lon) {
  const radius = 0.15; // graus (aproximadamente 15km)
  const points = 32;
  const coordinates = [];
  
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const pointLat = lat + radius * Math.cos(angle);
    const pointLon = lon + radius * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    coordinates.push([pointLon, pointLat]);
  }
  
  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
}

// Criar máscara para escurecer o resto do mapa, mantendo apenas a cidade destacada
function createCityMask(ctx, cityBoundary, centerLat, centerLon, zoomLevel, width, height) {
  if (!cityBoundary) {
    return;
  }
  
  // Verificar se tem coordenadas válidas
  if (!cityBoundary.coordinates || !Array.isArray(cityBoundary.coordinates)) {
    return;
  }
  
  // Verificar se é Polygon ou MultiPolygon
  if (cityBoundary.type !== 'Polygon' && cityBoundary.type !== 'MultiPolygon') {
    return;
  }
  
  // Fórmula do Leaflet para converter lat/lon para pixels
  const zoom = Math.floor(zoomLevel);
  const scale = Math.pow(2, zoom);
  const tileSize = 256;
  const worldSize = tileSize * scale;
  
  function latLonToPixel(lat, lon) {
    const x = (lon + 180) / 360 * worldSize;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;
    return [x, y];
  }
  
  const mapSize = 2712; // Tamanho do mapa renderizado (aumentado para melhor qualidade)
  
  // Calcular posição do centro em pixels no mundo
  const centerWorldPixel = latLonToPixel(centerLat, centerLon);
  
  // O Leaflet centraliza o mapa no centerLat/centerLon
  // No canvas de 2712x2712, o centro visual está em (1356, 1356)
  // Precisamos calcular o offset
  const mapCenter = mapSize / 2; // 1356
  const offsetX = mapCenter - centerWorldPixel[0];
  const offsetY = mapCenter - centerWorldPixel[1];
  
  // O crop começa em (mapCenter - width/2, mapCenter - height/2)
  const cropStartX = mapCenter - width / 2;
  const cropStartY = mapCenter - height / 2;
  
  // Criar um canvas temporário para a máscara
  const maskCanvas = createCanvas(width, height);
  const maskCtx = maskCanvas.getContext("2d");
  
  // Preencher tudo de preto (área escurecida)
  maskCtx.fillStyle = 'black';
  maskCtx.fillRect(0, 0, width, height);
  
  // Criar caminho da cidade em branco (área não escurecida)
  maskCtx.fillStyle = 'white';
  maskCtx.beginPath();
  
  function addPolygonToPath(coords) {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      return;
    }
    
    let first = true;
    
    coords.forEach(coord => {
      if (!Array.isArray(coord) || coord.length < 2) {
        return;
      }
      
      const [lon, lat] = coord;
      
      // Validar coordenadas
      if (typeof lat !== 'number' || typeof lon !== 'number' || 
          isNaN(lat) || isNaN(lon) || 
          lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return;
      }
      
      const [worldX, worldY] = latLonToPixel(lat, lon);
      
      // Converter para coordenadas do crop
      const x = worldX + offsetX - cropStartX;
      const y = worldY + offsetY - cropStartY;
      
      if (first) {
        maskCtx.moveTo(x, y);
        first = false;
      } else {
        maskCtx.lineTo(x, y);
      }
    });
  }
  
  if (cityBoundary.type === 'Polygon') {
    if (cityBoundary.coordinates[0] && cityBoundary.coordinates[0].length > 0) {
      addPolygonToPath(cityBoundary.coordinates[0]);
    }
  } else if (cityBoundary.type === 'MultiPolygon') {
    cityBoundary.coordinates.forEach(polygon => {
      if (polygon && polygon[0] && polygon[0].length > 0) {
        addPolygonToPath(polygon[0]);
      }
    });
  }
  
  maskCtx.closePath();
  maskCtx.fill();
  
  // Aplicar máscara: escurecer tudo exceto a cidade
  // A máscara tem: preto (área a escurecer) e branco (área da cidade - manter brilhante)
  
  ctx.save();
  
  // Criar overlay escuro usando clipping path
  // Primeiro, criar o caminho da área a escurecer (inverso da cidade)
  ctx.beginPath();
  ctx.rect(0, 0, width, height); // Retângulo cobrindo tudo
  
  // Criar caminho da cidade (área a NÃO escurecer)
  function addCityPath(coords) {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      return;
    }
    
    let first = true;
    
    coords.forEach(coord => {
      if (!Array.isArray(coord) || coord.length < 2) {
        return;
      }
      
      const [lon, lat] = coord;
      
      if (typeof lat !== 'number' || typeof lon !== 'number' || 
          isNaN(lat) || isNaN(lon) || 
          lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return;
      }
      
      const [worldX, worldY] = latLonToPixel(lat, lon);
      const x = worldX + offsetX - cropStartX;
      const y = worldY + offsetY - cropStartY;
      
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    });
  }
  
  // Adicionar caminho da cidade como "buraco" no retângulo
  if (cityBoundary.type === 'Polygon') {
    if (cityBoundary.coordinates[0] && cityBoundary.coordinates[0].length > 0) {
      addCityPath(cityBoundary.coordinates[0]);
    }
  } else if (cityBoundary.type === 'MultiPolygon') {
    cityBoundary.coordinates.forEach(polygon => {
      if (polygon && polygon[0] && polygon[0].length > 0) {
        addCityPath(polygon[0]);
      }
    });
  }
  
  // Usar even-odd fill rule para criar o "buraco" da cidade
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Overlay preto semi-transparente (60% de opacidade)
  ctx.fill('evenodd'); // Preenche apenas a área fora da cidade
  
  ctx.restore();
}

// Desenhar contorno da cidade
function drawCityContour(ctx, cityBoundary, centerLat, centerLon, zoomLevel, width, height) {
  if (!cityBoundary) {
    console.warn("   ⚠️ cityBoundary é null/undefined");
    return;
  }
  
  // Verificar se tem coordenadas válidas
  if (!cityBoundary.coordinates || !Array.isArray(cityBoundary.coordinates)) {
    console.warn("   ⚠️ cityBoundary não tem coordenadas válidas");
    return;
  }
  
  // Verificar se é Polygon ou MultiPolygon
  if (cityBoundary.type !== 'Polygon' && cityBoundary.type !== 'MultiPolygon') {
    console.warn(`   ⚠️ Tipo de geometria não suportado: ${cityBoundary.type}`);
    return;
  }
  
  // Fórmula do Leaflet para converter lat/lon para pixels
  const zoom = Math.floor(zoomLevel);
  const scale = Math.pow(2, zoom);
  const tileSize = 256;
  const worldSize = tileSize * scale;
  
  function latLonToPixel(lat, lon) {
    const x = (lon + 180) / 360 * worldSize;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;
    return [x, y];
  }
  
  const mapSize = 2712; // Tamanho do mapa renderizado (aumentado para melhor qualidade)
  
  // Calcular posição do centro em pixels no mundo
  const centerWorldPixel = latLonToPixel(centerLat, centerLon);
  
  // O Leaflet centraliza o mapa no centerLat/centerLon
  // No canvas de 2712x2712, o centro visual está em (1356, 1356)
  // Precisamos calcular o offset
  const mapCenter = mapSize / 2; // 1356
  const offsetX = mapCenter - centerWorldPixel[0];
  const offsetY = mapCenter - centerWorldPixel[1];
  
  // O crop começa em (mapCenter - width/2, mapCenter - height/2)
  const cropStartX = mapCenter - width / 2;
  const cropStartY = mapCenter - height / 2;
  
  // Cor e estilo
  ctx.strokeStyle = '#FFFF00'; // Amarelo brilhante
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  let pointsDrawn = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  function drawPolygon(coords) {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      console.warn("   ⚠️ Coordenadas do polígono inválidas");
      return;
    }
    
    ctx.beginPath();
    let first = true;
    
    coords.forEach(coord => {
      if (!Array.isArray(coord) || coord.length < 2) {
        return; // Pular coordenadas inválidas
      }
      
      const [lon, lat] = coord;
      
      // Validar coordenadas
      if (typeof lat !== 'number' || typeof lon !== 'number' || 
          isNaN(lat) || isNaN(lon) || 
          lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return; // Pular coordenadas inválidas
      }
      
      const [worldX, worldY] = latLonToPixel(lat, lon);
      
      // Converter para coordenadas do crop
      const x = worldX + offsetX - cropStartX;
      const y = worldY + offsetY - cropStartY;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
      pointsDrawn++;
    });
    
    if (pointsDrawn > 0) {
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  if (cityBoundary.type === 'Polygon') {
    if (cityBoundary.coordinates[0] && cityBoundary.coordinates[0].length > 0) {
      drawPolygon(cityBoundary.coordinates[0]);
    } else {
      console.warn("   ⚠️ Polygon sem coordenadas válidas");
    }
  } else if (cityBoundary.type === 'MultiPolygon') {
    cityBoundary.coordinates.forEach((polygon, index) => {
      if (polygon && polygon[0] && polygon[0].length > 0) {
        drawPolygon(polygon[0]);
      } else {
        console.warn(`   ⚠️ MultiPolygon[${index}] sem coordenadas válidas`);
      }
    });
  }
  
  // Debug
  console.log(`   📊 Contorno: ${pointsDrawn} pontos desenhados`);
  if (pointsDrawn > 0) {
    console.log(`   📐 Bounds: X(${minX.toFixed(1)}, ${maxX.toFixed(1)}) Y(${minY.toFixed(1)}, ${maxY.toFixed(1)})`);
    console.log(`   📐 Visível: X(0, ${width}) Y(0, ${height})`);
    
    if (minX >= 0 && maxX <= width && minY >= 0 && maxY <= height) {
      console.log(`   ✅ Contorno dentro da área visível`);
    } else {
      console.warn(`   ⚠️ Contorno pode estar parcialmente fora`);
    }
  } else {
    console.warn(`   ⚠️ Nenhum ponto foi desenhado - verifique as coordenadas`);
  }
}

// Calcular zoom necessário para que uma área caiba na imagem
function calculateZoomForBounds(minLat, maxLat, minLon, maxLon, imageWidth, imageHeight, padding = 0.08) {
  // Padding reduzido de 10% para 8% em cada lado (cidade ficará um pouco maior)
  const paddingFactor = 1 + (padding * 2);
  
  // Calcular dimensões da área em graus
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  
  // Converter para Web Mercator para calcular distâncias
  function latLonToMercator(lat, lon) {
    const x = lon * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return [x, y];
  }
  
  const [x1, y1] = latLonToMercator(minLat, minLon);
  const [x2, y2] = latLonToMercator(maxLat, maxLon);
  
  const widthMeters = Math.abs(x2 - x1) * paddingFactor;
  const heightMeters = Math.abs(y2 - y1) * paddingFactor;
  
  // Calcular zoom necessário
  const tileSize = 256;
  const worldSize = 40075016.68; // Circunferência da Terra em metros (Web Mercator)
  
  // Calcular zoom baseado na largura
  const zoomX = Math.log2((worldSize * imageWidth) / (widthMeters * tileSize));
  const zoomY = Math.log2((worldSize * imageHeight) / (heightMeters * tileSize));
  
  // Usar o menor zoom para garantir que tudo caiba
  const zoom = Math.floor(Math.min(zoomX, zoomY));
  
  // Limitar zoom entre 1 e 18
  return Math.max(1, Math.min(18, zoom));
}

// Calcular bounding box de uma geometria GeoJSON
function calculateGeometryBounds(geometry) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  function processCoordinates(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(coord => processCoordinates(coord));
    } else {
      const [lon, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  }
  
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => processCoordinates(ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => processCoordinates(ring));
    });
  }
  
  return { minLat, maxLat, minLon, maxLon };
}

// Capturar screenshot do mapa Windy usando Puppeteer
async function captureWindyMap(layer, forecastHours, cityName = null) {
  console.log(`🌐 Capturando mapa do Windy: ${layer} (${forecastHours}h à frente)...`);
  
  // Determinar centro e zoom
  let centerLat, centerLon, zoomLevel, cityData = null, cityBoundary = null;
  
  if (cityName) {
    console.log(`   🔍 Buscando coordenadas de: ${cityName}...`);
    cityData = await getCityCoordinates(cityName);
    
    // Buscar limites da cidade para calcular zoom dinâmico
    console.log(`   📐 Buscando limites da cidade para calcular zoom...`);
    try {
      cityBoundary = await getCityBoundary(cityName, cityData.lat, cityData.lon);
      if (cityBoundary) {
        // Verificar se é Polygon ou MultiPolygon antes de calcular bounds
        if (cityBoundary.type !== 'Polygon' && cityBoundary.type !== 'MultiPolygon') {
          console.warn(`   ⚠️ Tipo de geometria não suportado para zoom: ${cityBoundary.type}, usando zoom padrão`);
          centerLat = cityData.lat;
          centerLon = cityData.lon;
          zoomLevel = 8;
        } else {
          const bounds = calculateGeometryBounds(cityBoundary);
          
          // Verificar se os bounds são válidos
          if (bounds.minLat === Infinity || bounds.maxLat === -Infinity || 
              bounds.minLon === Infinity || bounds.maxLon === -Infinity) {
            throw new Error("Bounds inválidos calculados");
          }
        
          // Verificar se a área não é muito grande (mais de 5 graus = provavelmente estado/país)
          const latRange = bounds.maxLat - bounds.minLat;
          const lonRange = bounds.maxLon - bounds.minLon;
          
          if (latRange > 5 || lonRange > 5) {
            console.warn(`   ⚠️ Área muito grande (${latRange.toFixed(2)}° x ${lonRange.toFixed(2)}°), usando coordenadas da cidade`);
            // Usar coordenadas da cidade e zoom fixo
            centerLat = cityData.lat;
            centerLon = cityData.lon;
            zoomLevel = 8;
          } else {
            // Calcular centro do bounding box
            centerLat = (bounds.minLat + bounds.maxLat) / 2;
            centerLon = (bounds.minLon + bounds.maxLon) / 2;
            
          // Calcular zoom dinâmico para que a cidade caiba na imagem
          zoomLevel = calculateZoomForBounds(
            bounds.minLat, bounds.maxLat,
            bounds.minLon, bounds.maxLon,
            cropWidth, cropHeight
          );
          
          // Aumentar o zoom em 0.3 níveis para a cidade ficar um pouco maior na imagem
          zoomLevel = zoomLevel + 0.3;
          
          // Garantir que o zoom não seja muito baixo (mínimo 6 para cidades)
          if (zoomLevel < 6) {
            console.warn(`   ⚠️ Zoom muito baixo (${zoomLevel}), ajustando para 6`);
            zoomLevel = 6;
          }
          
          // Limitar zoom máximo para evitar problemas de renderização
          if (zoomLevel > 15) {
            console.warn(`   ⚠️ Zoom muito alto (${zoomLevel}), limitando para 15`);
            zoomLevel = 15;
          }
          }
          
          console.log(`   ✅ Cidade: ${cityData.name}`);
          console.log(`   📍 Centro: (${centerLat.toFixed(4)}, ${centerLon.toFixed(4)})`);
          console.log(`   📏 Bounds: (${bounds.minLat.toFixed(4)}, ${bounds.minLon.toFixed(4)}) a (${bounds.maxLat.toFixed(4)}, ${bounds.maxLon.toFixed(4)})`);
          console.log(`   📐 Tamanho: ${latRange.toFixed(2)}° x ${lonRange.toFixed(2)}°`);
          console.log(`   🔍 Zoom calculado: ${zoomLevel}`);
        }
      } else {
        // Fallback se não conseguir os limites
        centerLat = cityData.lat;
        centerLon = cityData.lon;
        zoomLevel = 8;
        console.log(`   ⚠️ Usando zoom padrão (8) - limites não encontrados`);
      }
    } catch (error) {
      // Fallback se houver erro
      centerLat = cityData.lat;
      centerLon = cityData.lon;
      zoomLevel = 8;
      console.warn(`   ⚠️ Erro ao calcular zoom dinâmico: ${error.message}, usando zoom padrão (8)`);
      console.warn(`   📍 Usando coordenadas da cidade: (${centerLat}, ${centerLon})`);
      
      // Se não temos cityBoundary ainda, tentar buscar (pode ser que o erro tenha sido nos bounds, não na busca)
      if (!cityBoundary) {
        try {
          console.log(`   🔄 Tentando buscar limites novamente após erro...`);
          cityBoundary = await getCityBoundary(cityName, cityData.lat, cityData.lon);
        } catch (boundaryError) {
          console.warn(`   ⚠️ Não foi possível buscar limites: ${boundaryError.message}`);
        }
      }
    }
  } else {
    // Centro do Brasil
    centerLat = (minLat + maxLat) / 2;
    centerLon = (minLon + maxLon) / 2;
    zoomLevel = 4.1; // Zoom padrão para Brasil
  }
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    // Aumentar viewport para melhor qualidade (proporcional ao crop)
    const viewportSize = 2712; // 1808 * 1.5 (proporcional ao aumento do crop)
    await page.setViewport({ width: viewportSize, height: viewportSize });
    
    // Calcular timestamp da previsão
    const forecastDate = new Date();
    forecastDate.setHours(forecastDate.getHours() + forecastHours);
    const timestamp = forecastDate.getTime();
    
    // Mapear layer para overlay do Windy
    // Overlays disponíveis: satellite, clouds, radar, temp, wind, rain, thunder
    const overlayMap = {
      'satellite': 'satellite',      // Satélite
      'clouds': 'clouds',             // Nuvens
      'radar': 'radar',               // Radar meteorológico
      'temp': 'temp',                 // Temperatura
      'wind': 'wind',                 // Vento
      'rain': 'rain',                 // Chuva
      'thunder': 'thunder',           // Trovão
      'rainthunder': 'rainthunder'    // Chuva e trovão
    };
    
    const overlay = overlayMap[layer] || 'satellite';
    
    // Criar HTML com Windy Map Forecast API
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        #windy { width: ${viewportSize}px; height: ${viewportSize}px; }
    </style>
</head>
<body>
    <div id="windy"></div>
    <script src="https://unpkg.com/leaflet@1.4.0/dist/leaflet.js"></script>
    <script src="https://api.windy.com/assets/map-forecast/libBoot.js"></script>
    <script>
        window.mapReady = false;
        window.mapError = false;
        
        // Zoom configurável
        const zoomLevel = ${zoomLevel};
        
        const options = {
            key: '${WINDY_API_KEY}',
            lat: ${centerLat},
            lon: ${centerLon},
            zoom: zoomLevel,
            timestamp: ${timestamp},
            overlay: '${overlay}',
            units: 'metric'
        };
        
        try {
            windyInit(options, windyAPI => {
                const { store, map } = windyAPI;
                
                // Ajustar zoom usando a mesma variável
                map.setView([${centerLat}, ${centerLon}], zoomLevel);
                
                // Aguardar mapa carregar completamente
                map.whenReady(() => {
                    // Aguardar um pouco mais para os tiles carregarem
                    setTimeout(() => {
                        window.mapReady = true;
                    }, 8000);
                });
                
                // Fallback: marcar como pronto após 15 segundos mesmo se não carregar
                setTimeout(() => {
                    if (!window.mapReady) {
                        console.log('Timeout - capturando mesmo assim');
                        window.mapReady = true;
                    }
                }, 20000);
            });
        } catch (error) {
            console.error('Erro ao inicializar Windy:', error);
            window.mapError = true;
            window.mapReady = true; // Marcar como pronto para não travar
        }
    </script>
</body>
</html>
    `;
    
    await page.setContent(html);
    
    // Aguardar mapa carregar (aumentar timeout)
    try {
        await page.waitForFunction(() => window.mapReady === true, { timeout: 60000 });
    } catch (error) {
        console.log('⚠️ Timeout aguardando mapa, capturando mesmo assim...');
    }
    
    // Aguardar mais um pouco para garantir que tiles carregaram
    await page.waitForTimeout(5000);
    
    // Capturar screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: viewportSize,
        height: viewportSize
      }
    });
    
    await browser.close();
    
    return { screenshot, centerLat, centerLon, zoomLevel, cityData, cityBoundary, viewportSize };
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Desenhar legenda
function drawWindyLegend(ctx, width, height, layer, forecastHours, cityData = null) {
  const legendWidth = 280; // Aumentado de 200
  const legendHeight = 250; // Aumentado de 180
  const padding = 12; // Aumentado de 8
  const lineHeight = 18; // Aumentado de 14
  
  // Se for uma cidade, colocar legenda no canto inferior direito para não sobrepor
  // Se não for cidade, manter no canto superior direito
  let legendX, legendY;
  if (cityData) {
    // Cidade: legenda no canto inferior direito
    legendX = width - legendWidth - 10;
    legendY = height - legendHeight - 10;
  } else {
    // Brasil: legenda no canto superior direito
    legendX = width - legendWidth - 10;
    legendY = 10;
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
  
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
  
  let currentY = legendY + padding + 18;
  
  // Data/hora no canto superior direito
  const now = new Date();
  const forecastDate = new Date(now.getTime() + forecastHours * 60 * 60 * 1000);
  const dateStr = forecastDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
  ctx.font = '13px Arial'; // Aumentado de 10px
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'right';
  ctx.fillText(`Previsão: ${dateStr}`, legendX + legendWidth - padding, legendY + padding + 13);
  
  const genDateStr = now.toISOString().split('T')[0];
  ctx.fillText(`Gerado: ${genDateStr}`, legendX + legendWidth - padding, legendY + padding + 30);
  ctx.textAlign = 'left';
  
  // Título (sem "Windy")
  ctx.fillStyle = 'white';
  ctx.font = 'bold 18px Arial'; // Aumentado de 14px
  const layerNames = {
    'satellite': 'Satélite',
    'clouds': 'Nuvens',
    'radar': 'Radar Meteorológico',
    'temp': 'Temperatura',
    'wind': 'Vento',
    'rain': 'Chuva',
    'thunder': 'Trovão',
    'rainthunder': 'Chuva e Trovão'
  };
  ctx.fillText(layerNames[layer] || layer, legendX + padding, currentY);
  currentY += lineHeight + 5;
  
  // Modelo de previsão
  ctx.font = '14px Arial'; // Aumentado de 11px
  ctx.fillText('Modelo: ECMWF', legendX + padding, currentY);
  currentY += lineHeight;
  ctx.fillText(`Previsão: +${forecastHours}h`, legendX + padding, currentY);
  currentY += lineHeight + 5;
  
  // Interpretação das cores baseada na camada
  ctx.font = 'bold 14px Arial'; // Aumentado de 11px
  ctx.fillText('Interpretação:', legendX + padding, currentY);
  currentY += lineHeight + 3;
  
  ctx.font = '13px Arial'; // Aumentado de 10px
  
  if (layer === 'temp') {
    ctx.fillText('Azul: Frio (< 15°C)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Verde: Moderado (15-25°C)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo: Quente (25-30°C)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho: Muito Quente (> 30°C)', legendX + padding, currentY);
  } else if (layer === 'wind') {
    ctx.fillText('Azul claro: Vento fraco (< 10 km/h)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Verde: Vento moderado (10-30 km/h)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo: Vento forte (30-50 km/h)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho: Vento muito forte (> 50 km/h)', legendX + padding, currentY);
  } else if (layer === 'rain' || layer === 'radar') {
    ctx.fillText('Azul claro: Sem chuva', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Verde: Chuva leve (0-5 mm/h)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo: Chuva moderada (5-15 mm/h)', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho: Chuva forte (> 15 mm/h)', legendX + padding, currentY);
  } else if (layer === 'rainthunder') {
    ctx.fillText('Azul: Sem atividade', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Verde: Chuva leve', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo: Chuva moderada', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho: Tempestades intensas', legendX + padding, currentY);
  } else if (layer === 'clouds') {
    ctx.fillText('Branco/Cinza claro: Sem nuvens', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Cinza: Nuvens baixas', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Cinza escuro: Nuvens médias', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Preto: Nuvens densas/altas', legendX + padding, currentY);
  } else if (layer === 'satellite') {
    ctx.fillText('Branco/Ciano: Nuvens muito altas', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Verde: Nuvens médias', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo/Laranja: Nuvens baixas', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho/Preto: Superfície/Céu limpo', legendX + padding, currentY);
  } else if (layer === 'thunder') {
    ctx.fillText('Azul: Sem atividade', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Amarelo: Atividade elétrica leve', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Laranja: Atividade moderada', legendX + padding, currentY);
    currentY += lineHeight;
    ctx.fillText('Vermelho: Tempestades intensas', legendX + padding, currentY);
  }
}

async function main() {
  console.log(`🌍 Gerando mapa de previsão Windy (Map Forecast API)...`);
  console.log(`   Camada: ${LAYER}`);
  console.log(`   Horas: ${FORECAST_HOURS}h`);
  if (CITY) {
    console.log(`   Cidade: ${CITY}`);
  }
  
  // Capturar screenshot do mapa Windy
  const { screenshot, centerLat, centerLon, zoomLevel, cityData, cityBoundary, viewportSize } = await captureWindyMap(LAYER, FORECAST_HOURS, CITY);
  
  // Carregar imagem
  const windyImg = await loadImage(screenshot);
  
  // Calcular crop do Brasil na imagem (viewportSize x viewportSize)
  const centerX = viewportSize / 2;
  const centerY = viewportSize / 2;
  const cropX = centerX - cropWidth / 2;
  const cropY = centerY - cropHeight / 2;
  
  // Criar canvas final
  const canvas = createCanvas(cropWidth, cropHeight);
  const ctx = canvas.getContext("2d");
  
  // Desenhar crop da imagem Windy
  ctx.drawImage(
    windyImg,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );
  
  // Se uma cidade foi selecionada, criar máscara e desenhar contorno
  // IMPORTANTE: Se cityBoundary não foi encontrado durante o cálculo do zoom, tentar buscar novamente
  if (CITY && cityData) {
    console.log("🎨 Criando máscara e desenhando contorno da cidade...");
    try {
      // Se não temos cityBoundary, tentar buscar novamente
      if (!cityBoundary) {
        console.log("   🔄 Buscando limites novamente...");
        cityBoundary = await getCityBoundary(CITY, cityData.lat, cityData.lon);
      }
      
      if (cityBoundary) {
        // Criar máscara para escurecer o resto do mapa
        createCityMask(ctx, cityBoundary, centerLat, centerLon, zoomLevel, cropWidth, cropHeight);
        
        // Desenhar contorno da cidade
        drawCityContour(ctx, cityBoundary, centerLat, centerLon, zoomLevel, cropWidth, cropHeight);
        console.log("   ✅ Máscara e contorno desenhados");
      } else {
        console.warn("   ⚠️ Não foi possível obter limites da cidade para desenhar contorno");
      }
    } catch (error) {
      console.warn(`   ⚠️ Erro ao criar máscara/contorno: ${error.message}`);
      console.error(error);
    }
  }
  
  // Adicionar legenda (posicionada de acordo com se é cidade ou Brasil)
  // Desenhar DEPOIS do contorno para que a legenda fique por cima
  drawWindyLegend(ctx, cropWidth, cropHeight, LAYER, FORECAST_HOURS, cityData);
  
  // Obter pasta correspondente à camada
  const folderName = LAYER_FOLDERS[LAYER] || 'imgtemp'; // Fallback para imgtemp se camada não encontrada
  const outputDir = path.join(__dirname, folderName);
  
  // Criar pasta se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Pasta criada: ${folderName}`);
  }
  
  // Gerar nome do arquivo
  let fileName;
  if (CITY && cityData) {
    // Normalizar nome da cidade para nome de arquivo (remover espaços, acentos, etc.)
    const cityName = cityData.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '') // Remove espaços
      .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
      .toLowerCase();
    fileName = `${cityName}_windy_${LAYER}_${FORECAST_HOURS}h.png`;
  } else {
    fileName = `brasil_windy_${LAYER}_${FORECAST_HOURS}h.png`;
  }
  
  // Caminho completo do arquivo
  const outputPath = path.join(outputDir, fileName);
  
  fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(`✅ Gerado: ${outputPath}`);
}

main().catch(console.error);

