/**
 * mapGenerator.js — Núcleo de geração procedural
 *
 * Responsabilidades:
 *  - Criar a estrutura de dados do mapa (salas + corredores)
 *  - Posicionar salas sem sobreposição
 *  - Expor o mapa gerado para o Renderer e CorridorBuilder
 *
 * Estrutura esperada de um mapa:
 * {
 *   seed:      string,
 *   width:     number,   // em tiles ou pixels, sua escolha
 *   height:    number,
 *   rooms:     Room[],
 *   corridors: Corridor[],
 * }
 *
 * Estrutura de uma Room:
 * {
 *   id:       number,
 *   x:        number,
 *   y:        number,
 *   width:    number,
 *   height:   number,
 *   assetKey: string,   // chave do PNG correspondente em AssetLoader
 *   type:     string,   // 'start' | 'end' | 'normal' | 'boss' | etc.
 *   connections: number[], // ids das salas conectadas
 * }
 */

const MapGenerator = (() => {

  // ---------------------------------------------------
  // Configurações padrão — ajuste conforme necessário
  // ---------------------------------------------------
  const DEFAULTS = {
    roomCount:   { small: 5, medium: 10, large: 20 },
    mapWidth:    2000,   // largura total da área de geração (px)
    mapHeight:   1500,
    minRoomSize: 80,
    maxRoomSize: 160,
    padding:     20,     // espaço mínimo entre salas
  };

  // ---------------------------------------------------
  // generate(options) — função principal pública
  //
  // @param {object} options
  //   - seed    {string}  seed de aleatoriedade
  //   - size    {string}  'small' | 'medium' | 'large'
  //   - assets  {object}  mapa de assets carregados
  //
  // @returns {object} mapa completo com rooms e corridors
  // ---------------------------------------------------
  function generate(options) {
    // TODO: aplicar seed no módulo Random

    // TODO: determinar quantidade de salas com base em options.size

    // TODO: chamar _placeRooms() para gerar array de Room

    // TODO: chamar CorridorBuilder.build(rooms) para gerar corredores

    // TODO: identificar sala inicial e final (_markSpecialRooms)

    // TODO: retornar objeto de mapa completo
  }

  // ---------------------------------------------------
  // _placeRooms(count, assets)
  // Gera `count` salas sem sobreposição.
  //
  // @returns {Room[]}
  // ---------------------------------------------------
  function _placeRooms(count, assets) {
    // TODO: criar array de salas vazio

    // TODO: para cada sala:
    //   - gerar posição aleatória dentro dos limites do mapa
    //   - verificar sobreposição com salas já colocadas (_overlaps)
    //   - se sobrepõe, tentar nova posição (máx N tentativas)
    //   - associar um assetKey aleatório do pool de assets
    //   - adicionar ao array

    // TODO: retornar array de salas
  }

  // ---------------------------------------------------
  // _overlaps(roomA, roomB)
  // Verifica se duas salas se sobrepõem (com padding).
  //
  // @returns {boolean}
  // ---------------------------------------------------
  function _overlaps(roomA, roomB) {
    // TODO: comparar bounding boxes com margem de DEFAULTS.padding
  }

  // ---------------------------------------------------
  // _markSpecialRooms(rooms)
  // Define qual sala é 'start' e qual é 'end'.
  // Geralmente a mais distante da inicial.
  // ---------------------------------------------------
  function _markSpecialRooms(rooms) {
    // TODO: marcar rooms[0] (ou alguma lógica) como type = 'start'

    // TODO: calcular a sala mais distante da inicial e marcar como 'end'

    // TODO: opcionalmente marcar uma sala como 'boss'
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { generate };

})();