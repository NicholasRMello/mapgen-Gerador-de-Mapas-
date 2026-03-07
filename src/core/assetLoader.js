/**
 * assetLoader.js — Carregamento e cache de PNGs
 *
 * Responsabilidades:
 *  - Carregar todos os PNGs das pastas /assets/*
 *  - Disponibilizar as imagens para Renderer e MapGenerator
 *  - Popular os slots visuais no painel lateral (sidebar)
 *
 * Estrutura do catálogo de assets:
 * Edite ASSET_MANIFEST para registrar seus PNGs.
 * Formato: { key: string, path: string, group: string }
 */

const AssetLoader = (() => {

  // ---------------------------------------------------
  // ASSET_MANIFEST
  // Liste aqui todos os PNGs que quer usar no mapa.
  // 'key'   → identificador usado pelo MapGenerator
  // 'path'  → caminho relativo a partir de index.html
  // 'group' → 'rooms' | 'tiles' | 'ui'
  // ---------------------------------------------------
  const ASSET_MANIFEST = [
    // Exemplos — substitua pelos seus arquivos reais:
    { key: 'room_cave',    path: 'assets/rooms/cave.png',    group: 'rooms' },
    { key: 'room_dungeon', path: 'assets/rooms/dungeon.png', group: 'rooms' },
    { key: 'tile_floor',   path: 'assets/tiles/floor.png',   group: 'tiles' },
    { key: 'tile_wall',    path: 'assets/tiles/wall.png',    group: 'tiles' },
    { key: 'icon_start',   path: 'assets/ui/start.png',      group: 'ui'    },
    { key: 'icon_boss',    path: 'assets/ui/boss.png',       group: 'ui'    },
  ];

  // Cache interno: { key → HTMLImageElement }
  const _cache = {};

  // ---------------------------------------------------
  // load()
  // Carrega todos os assets do ASSET_MANIFEST em paralelo.
  //
  // @returns {Promise<object>}  resolves com o cache completo
  // ---------------------------------------------------
  function load() {
    // TODO: para cada item do ASSET_MANIFEST, criar uma Promise
    //       que cria um new Image(), seta src e resolve no onload

    // TODO: usar Promise.all() para aguardar todos os carregamentos

    // TODO: popular _cache com { key: imageElement }

    // TODO: ao terminar, chamar _populateSidebar()

    // TODO: retornar Promise que resolve com _cache
  }

  // ---------------------------------------------------
  // get(key)
  // Retorna o HTMLImageElement pelo key do manifest.
  //
  // @param {string} key
  // @returns {HTMLImageElement | null}
  // ---------------------------------------------------
  function get(key) {
    // TODO: buscar e retornar _cache[key]

    // TODO: logar aviso se key não encontrado
  }

  // ---------------------------------------------------
  // getByGroup(group)
  // Retorna todos os assets de um grupo específico.
  //
  // @param {string} group  'rooms' | 'tiles' | 'ui'
  // @returns {{ key, img }[]}
  // ---------------------------------------------------
  function getByGroup(group) {
    // TODO: filtrar ASSET_MANIFEST pelo group

    // TODO: retornar array de { key, img: _cache[key] }
  }

  // ---------------------------------------------------
  // getKeys(group)
  // Retorna apenas as keys de um grupo.
  // Usado pelo MapGenerator para sortear assets aleatórios.
  //
  // @param {string} group
  // @returns {string[]}
  // ---------------------------------------------------
  function getKeys(group) {
    // TODO: filtrar ASSET_MANIFEST e retornar só as keys do grupo
  }

  // ---------------------------------------------------
  // _populateSidebar()
  // Cria os .asset-slot com <img> dentro das grids do HTML
  // para exibir as miniaturas dos PNGs carregados.
  // ---------------------------------------------------
  function _populateSidebar() {
    // TODO: para cada group ('rooms', 'tiles', 'ui'):
    //   - obter o elemento #slots-{group} do DOM
    //   - para cada asset do grupo, criar um div.asset-slot
    //   - criar <img> com src = asset.path e colocar dentro do slot
    //   - adicionar evento de clique para seleção (opcional)
    //   - appendar o slot na grid
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { load, get, getByGroup, getKeys };

})();