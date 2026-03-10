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
  // Lista de todos os PNGs usados no mapa.
  // 'key'   → identificador usado pelo MapGenerator
  // 'path'  → caminho relativo a partir de index.html
  // 'group' → 'rooms' | 'tiles' | 'ui'
  // ---------------------------------------------------
  const ASSET_MANIFEST = [
    { key: 'room_cave',    path: 'assets/rooms/cave.png',    group: 'rooms' },
    { key: 'room_dungeon', path: 'assets/rooms/dungeon.png', group: 'rooms' },
    { key: 'tile_floor',   path: 'assets/tiles/floor.png',   group: 'tiles' },
    { key: 'tile_wall',    path: 'assets/tiles/wall.png',    group: 'tiles' },
    { key: 'icon_start',   path: 'assets/ui/start.png',      group: 'ui'    },
    { key: 'icon_boss',    path: 'assets/ui/boss.png',       group: 'ui'    },
  ];

  // Cache interno: mapeia key → HTMLImageElement carregado
  const _cache = {};

  // ---------------------------------------------------
  // load()
  // Carrega todos os assets do ASSET_MANIFEST em paralelo.
  // Cada PNG é carregado via new Image() com promisificação.
  // Imagens que falharem (arquivo não encontrado) são ignoradas
  // silenciosamente para não travar a aplicação.
  //
  // @returns {Promise<object>}  resolve com o cache completo
  // ---------------------------------------------------
  function load() {
    // Cria uma Promise para cada item do manifesto
    const promises = ASSET_MANIFEST.map(item => {
      return new Promise(resolve => {
        const img = new Image();

        // Ao concluir o carregamento com sucesso, armazena no cache e resolve
        img.onload = () => {
          _cache[item.key] = img;
          resolve();
        };

        // Em caso de erro (arquivo não existe), resolve sem armazenar
        // para não bloquear Promise.all
        img.onerror = () => {
          console.warn(`[AssetLoader] Não foi possível carregar: ${item.path}`);
          resolve();
        };

        // Inicia o carregamento definindo o src
        img.src = item.path;
      });
    });

    // Aguarda todos os carregamentos (com ou sem erro) e popula a sidebar
    return Promise.all(promises).then(() => {
      _populateSidebar();
      return _cache;
    });
  }

  // ---------------------------------------------------
  // get(key)
  // Retorna o HTMLImageElement pelo key do manifesto.
  // Retorna null e loga aviso se a key não existir.
  //
  // @param {string} key
  // @returns {HTMLImageElement | null}
  // ---------------------------------------------------
  function get(key) {
    // Busca no cache pelo identificador
    const img = _cache[key];

    // Alerta no console se a imagem não foi encontrada ou falhou ao carregar
    if (!img) {
      console.warn(`[AssetLoader] Asset não encontrado no cache: "${key}"`);
      return null;
    }

    return img;
  }

  // ---------------------------------------------------
  // getByGroup(group)
  // Retorna todos os assets carregados de um grupo específico.
  // Útil para listar todos os tipos de sala disponíveis.
  //
  // @param {string} group  'rooms' | 'tiles' | 'ui'
  // @returns {{ key: string, img: HTMLImageElement }[]}
  // ---------------------------------------------------
  function getByGroup(group) {
    // Filtra o manifesto pelo grupo e retorna apenas os que carregaram com sucesso
    return ASSET_MANIFEST
      .filter(item => item.group === group)
      .filter(item => _cache[item.key])           // só os que estão no cache
      .map(item => ({ key: item.key, img: _cache[item.key] }));
  }

  // ---------------------------------------------------
  // getKeys(group)
  // Retorna apenas as keys de um grupo específico.
  // Usado pelo MapGenerator para sortear assets aleatórios
  // ao atribuir um visual para cada sala gerada.
  //
  // @param {string} group
  // @returns {string[]}
  // ---------------------------------------------------
  function getKeys(group) {
    // Filtra pelo grupo e retorna somente as keys dos assets carregados
    return ASSET_MANIFEST
      .filter(item => item.group === group && _cache[item.key])
      .map(item => item.key);
  }

  // ---------------------------------------------------
  // _populateSidebar()
  // Cria os elementos .asset-slot com <img> dentro das
  // grids do HTML para exibir as miniaturas dos PNGs carregados.
  // Chamada automaticamente ao final de load().
  // ---------------------------------------------------
  function _populateSidebar() {
    // Itera sobre os três grupos de assets
    ['rooms', 'tiles', 'ui'].forEach(group => {
      // Localiza a grid correspondente no HTML (ex.: #slots-rooms)
      const grid = document.getElementById(`slots-${group}`);
      if (!grid) return;

      // Limpa slots antigos caso load() seja chamada novamente
      grid.innerHTML = '';

      // Obtém todos os assets carregados do grupo atual
      const assets = getByGroup(group);

      assets.forEach(({ key, img }) => {
        // Cria o contêiner do slot
        const slot = document.createElement('div');
        slot.className  = 'asset-slot';
        slot.title      = key;            // tooltip com o nome da chave

        // Cria a imagem em miniatura
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.alt = key;

        // Adiciona a legenda com a key abaixo da imagem
        const label = document.createElement('span');
        label.textContent = key;

        // Monta o slot e insere na grid
        slot.appendChild(thumb);
        slot.appendChild(label);
        grid.appendChild(slot);
      });
    });
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { load, get, getByGroup, getKeys };

})();
