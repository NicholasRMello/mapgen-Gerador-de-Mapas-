/**
 * mapGenerator.js — Núcleo de geração procedural
 *
 * Responsabilidades:
 *  - Criar a estrutura de dados do mapa (salas + corredores)
 *  - Posicionar salas em grade virtual para evitar cruzamento de corredores
 *  - Expor o mapa gerado para o Renderer e CorridorBuilder
 *
 * Estrutura esperada de um mapa:
 * {
 *   seed:      string,
 *   width:     number,   // largura total da área de geração em pixels
 *   height:    number,   // altura total da área de geração em pixels
 *   rooms:     Room[],
 *   corridors: Corridor[],
 * }
 *
 * Estrutura de uma Room:
 * {
 *   id:          number,
 *   x:           number,
 *   y:           number,
 *   width:       number,
 *   height:      number,
 *   assetKey:    string | null,   // chave estática do AssetLoader (fallback sem user assets)
 *   userAsset:   object | null,   // objeto { id, name, img, type } do UserAssets
 *   type:        string,          // 'start' | 'end' | 'normal' | 'boss'
 *   connections: number[],        // ids das salas conectadas por corredor
 * }
 */

const MapGenerator = (() => {

  // ---------------------------------------------------
  // Configurações padrão — ajuste conforme necessário
  // ---------------------------------------------------
  const DEFAULTS = {
    roomCount:      { small: 5, medium: 10, large: 20 },
    mapWidth:       2000,  // largura total da área de geração (px)
    mapHeight:      1500,  // altura total da área de geração (px)
    minRoomSize:    80,    // tamanho mínimo de uma sala (px)
    maxRoomSize:    160,   // tamanho máximo de uma sala (px)
    corridorMargin: 60,    // margem reservada em cada borda de célula para corredor
    //
    // corridorMargin é a chave do sistema de posicionamento em grade:
    // o mapa é dividido em células; cada sala fica dentro da sua célula
    // com esta margem em todos os lados. Isso garante que corredores
    // entre células adjacentes passem ENTRE as salas, nunca ATRAVÉS.
  };

  // ---------------------------------------------------
  // generate(options) — função principal pública
  //
  // Aplica o seed, determina a quantidade de salas pelo
  // tamanho escolhido, gera e retorna o mapa completo.
  //
  // @param {object} options
  //   - seed       {string}  seed de aleatoriedade
  //   - size       {string}  'small' | 'medium' | 'large'
  //   - assets     {object}  referência ao AssetLoader (fallback estático)
  //   - userAssets {object}  referência ao UserAssets (imagens do usuário)
  //
  // @returns {object} mapa completo com rooms e corridors
  // ---------------------------------------------------
  function generate(options) {
    // Inicializa o gerador pseudoaleatório com o seed fornecido
    // para garantir que o mesmo seed sempre produza o mesmo mapa
    Random.seed(options.seed);

    // Determina a quantidade de salas com base no tamanho selecionado
    const size  = options.size || 'medium';
    const count = DEFAULTS.roomCount[size] || DEFAULTS.roomCount.medium;

    // Posiciona salas em grade virtual (sem sobreposição garantida)
    const rooms = _placeRooms(count);

    // Define tipos especiais (start, end, boss) ANTES de atribuir imagens
    // para que a imagem correta seja escolhida para cada tipo
    _markSpecialRooms(rooms);

    // Atribui imagem a cada sala (user asset → assetLoader → null)
    _assignRoomAssets(rooms, options.userAssets, options.assets);

    // Constrói corredores conectando todas as salas via MST
    const corridors = CorridorBuilder.build(rooms);

    return {
      seed:      options.seed,
      width:     DEFAULTS.mapWidth,
      height:    DEFAULTS.mapHeight,
      rooms,
      corridors,
    };
  }

  // ---------------------------------------------------
  // _placeRooms(count)
  // Posiciona salas usando um sistema de GRADE VIRTUAL.
  //
  // Como funciona:
  //  1. O mapa é dividido em cols×rows células — cada sala
  //     recebe uma célula exclusiva escolhida aleatoriamente.
  //  2. Dentro de cada célula, a sala é posicionada com margem
  //     DEFAULTS.corridorMargin em todos os lados.
  //  3. Essa margem é o "canal" do corredor: garante que qualquer
  //     corredor entre células adjacentes passe ENTRE salas,
  //     nunca ATRAVÉS de uma sala.
  //
  // Layouts de grade por quantidade de salas:
  //   small  (5)  → 3×2 = 6  células → ~667×750 px por célula
  //   medium (10) → 4×3 = 12 células → ~500×500 px por célula
  //   large  (20) → 5×4 = 20 células → ~400×375 px por célula
  //
  // @param {number} count  número de salas a gerar
  // @returns {Room[]}
  // ---------------------------------------------------
  function _placeRooms(count) {
    // Calcula as dimensões da grade usando a proporção do mapa
    // para criar células aproximadamente quadradas
    const cols = Math.ceil(Math.sqrt(count * DEFAULTS.mapWidth / DEFAULTS.mapHeight));
    const rows = Math.ceil(count / cols);

    // Tamanho de cada célula em pixels
    const cellW = DEFAULTS.mapWidth  / cols;
    const cellH = DEFAULTS.mapHeight / rows;

    // Cria todas as posições de célula (col, row) e embaralha
    // para distribuição aleatória mas determinística pelo seed
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ col: c, row: r });
      }
    }
    Random.shuffle(cells);

    const m     = DEFAULTS.corridorMargin;
    const rooms = [];

    for (let i = 0; i < count && i < cells.length; i++) {
      const { col, row } = cells[i];

      // Canto superior-esquerdo da célula em pixels
      const cellLeft = col * cellW;
      const cellTop  = row * cellH;

      // Tamanho máximo da sala confinado dentro da célula menos as margens
      const maxW = Math.max(DEFAULTS.minRoomSize, Math.floor(cellW - 2 * m));
      const maxH = Math.max(DEFAULTS.minRoomSize, Math.floor(cellH - 2 * m));

      const w = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxW));
      const h = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxH));

      // Espaço disponível para variação de posição dentro da célula
      // (espaço da célula - tamanho da sala - margem de ambos os lados)
      const xSpace = cellW - w - 2 * m;
      const ySpace = cellH - h - 2 * m;

      // Posição aleatória dentro das margens da célula
      // Se não houver espaço sobrante, centraliza a sala na célula
      const x = Math.round(cellLeft + m + (xSpace > 0 ? Random.float(0, xSpace) : xSpace / 2));
      const y = Math.round(cellTop  + m + (ySpace > 0 ? Random.float(0, ySpace) : ySpace / 2));

      rooms.push({
        id:          i,
        x,
        y,
        width:       w,
        height:      h,
        assetKey:    null,     // preenchido por _assignRoomAssets
        userAsset:   null,     // preenchido por _assignRoomAssets
        type:        'normal', // ajustado por _markSpecialRooms
        connections: [],       // preenchido pelo CorridorBuilder
      });
    }

    return rooms;
  }

  // ---------------------------------------------------
  // _markSpecialRooms(rooms)
  // Define os tipos especiais das salas após o posicionamento.
  //
  //  - 'start' → primeira sala do array (ponto de entrada do jogador)
  //  - 'end'   → sala mais distante da sala inicial (objetivo final)
  //  - 'boss'  → sala normal mais distante do início (mini-chefe)
  //
  // @param {Room[]} rooms  array de salas (modificado in-place)
  // ---------------------------------------------------
  function _markSpecialRooms(rooms) {
    if (rooms.length === 0) return;

    // A primeira sala gerada é sempre o ponto de início
    rooms[0].type = 'start';

    if (rooms.length === 1) return;

    // Calcula o centro da sala inicial como referência de distâncias
    const startCenter = MathUtils.rectCenter(rooms[0]);

    // Encontra a sala mais distante do início → sala de fim
    let farthestRoom     = rooms[1];
    let farthestDistance = 0;

    rooms.forEach(room => {
      if (room.id === rooms[0].id) return;

      const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
      if (dist > farthestDistance) {
        farthestDistance = dist;
        farthestRoom     = room;
      }
    });

    farthestRoom.type = 'end';

    // Marca uma sala de boss se houver salas suficientes (≥ 3 salas)
    if (rooms.length >= 3) {
      let bossRoom     = null;
      let bestDistance = 0;

      rooms.forEach(room => {
        // Só considera salas normais (não start nem end)
        if (room.type !== 'normal') return;

        const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
        if (dist > bestDistance) {
          bestDistance = dist;
          bossRoom     = room;
        }
      });

      if (bossRoom) bossRoom.type = 'boss';
    }
  }

  // ---------------------------------------------------
  // _assignRoomAssets(rooms, userAssets, assetLoader)
  // Atribui a imagem correta para cada sala APÓS os tipos
  // já terem sido definidos por _markSpecialRooms().
  //
  // Cadeia de prioridade:
  //  1. UserAssets com type === room.type  (correspondência exata)
  //  2. UserAssets com type === 'any'       (curinga do usuário)
  //  3. AssetLoader.getKeys('rooms')        (PNGs estáticos do manifesto)
  //  4. null                                (renderer usa retângulo colorido)
  //
  // Random.pick() garante seleção determinística pelo seed.
  //
  // @param {Room[]} rooms
  // @param {object} userAssets  módulo UserAssets (pode ser null)
  // @param {object} assetLoader módulo AssetLoader (fallback estático)
  // ---------------------------------------------------
  function _assignRoomAssets(rooms, userAssets, assetLoader) {
    const hasUserAssets = userAssets && userAssets.hasAny();

    // Pré-carrega as keys estáticas só se não houver user assets
    const staticKeys = (assetLoader && !hasUserAssets)
      ? assetLoader.getKeys('rooms')
      : [];

    rooms.forEach(room => {
      if (hasUserAssets) {
        // getByType() já aplica fallback para 'any' internamente
        const candidates = userAssets.getByType(room.type);
        if (candidates.length > 0) {
          room.userAsset = Random.pick(candidates);
        }
      } else {
        if (staticKeys.length > 0) {
          room.assetKey = Random.pick(staticKeys);
        }
      }
    });
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { generate };

})();
