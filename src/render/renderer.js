/**
 * renderer.js — Renderização do mapa no Canvas 2D
 *
 * Responsabilidades:
 *  - Desenhar corredores (retângulos entre centros das salas)
 *  - Desenhar salas (PNGs via drawImage ou fallback colorido)
 *  - Aplicar transformações da câmera (pan + zoom)
 *  - Destacar salas especiais com ícones e bordas coloridas
 *
 * Fluxo de desenho (painter's algorithm — fundo → frente):
 *  1. Limpar canvas com cor de fundo
 *  2. Aplicar transformação da câmera (Camera.apply)
 *  3. Desenhar background com grid de pontos
 *  4. Desenhar corredores (abaixo das salas)
 *  5. Desenhar salas (PNGs ou retângulos de fallback)
 *  6. Desenhar overlays (ícones de início/fim/boss, highlight de seleção)
 *  7. Desenhar pinos de anotação (acima de tudo)
 *  8. Restaurar transformação (Camera.restore)
 */

const Renderer = (() => {

  // Referências ao canvas e contexto 2D, definidas em init()
  let _canvas = null;
  let _ctx    = null;

  // Mapa atual armazenado para permitir re-renderização ao mover câmera
  let _currentMap = null;

  // Sala selecionada pelo clique do usuário (para highlight)
  let _selectedRoom = null;

  // Lista de pinos de anotação a renderizar — atualizada via setPins()
  let _pins = [];

  // Configurações visuais — ajuste para customizar a aparência
  const CONFIG = {
    corridorColor:   '#3a4acc',              // cor de preenchimento dos corredores
    corridorWidth:   16,                     // espessura dos corredores em px
    roomBorderColor: '#5c6bff',              // borda padrão das salas
    roomBorderWidth: 2,                      // espessura da borda das salas em px
    bgColor:         '#0e0f14',              // cor de fundo do canvas
    gridColor:       'rgba(42, 45, 58, 0.6)', // cor dos pontos do grid de fundo
    gridCellSize:    40,                     // tamanho de cada célula do grid em px
    highlightColor:  'rgba(92, 107, 255, 0.4)', // cor do highlight ao selecionar sala

    // Cores de borda por tipo de sala — usadas mesmo sem PNG
    roomColors: {
      start:  '#00ff88',  // verde para sala inicial
      end:    '#ff6b6b',  // vermelho para sala final
      boss:   '#ffaa00',  // laranja para sala do boss
      normal: '#2a2d3a',  // cinza escuro para salas normais
    },

    // Tamanho dos ícones de texto desenhados sobre salas especiais
    overlayFontSize: 18,
  };

  // ---------------------------------------------------
  // init(canvas, ctx)
  // Configura o renderer com as referências do canvas e contexto.
  // Deve ser chamada uma vez antes de qualquer draw().
  //
  // @param {HTMLCanvasElement}        canvas
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function init(canvas, ctx) {
    // Armazena as referências para uso em todos os métodos de desenho
    _canvas = canvas;
    _ctx    = ctx;

    // Ajusta o canvas para preencher seu contêiner na inicialização
    _resizeToContainer();
  }

  // ---------------------------------------------------
  // draw(map)
  // Redesenha o mapa completo do zero seguindo a ordem do painter's algorithm.
  // Salva o mapa atual para permitir re-renderizações ao mover a câmera.
  //
  // @param {object} map  objeto retornado por MapGenerator.generate()
  //                      Pode ser null para apenas limpar o canvas.
  // ---------------------------------------------------
  function draw(map) {
    // Armazena o mapa para permitir redesenho sem precisar receber novamente
    if (map !== undefined) _currentMap = map;

    // Passo 1: Limpa o canvas com a cor de fundo
    _clear();

    // Sem mapa, apenas mostra o fundo limpo
    if (!_currentMap) return;

    // Passo 2: Aplica as transformações da câmera (pan + zoom)
    Camera.apply(_ctx);

    // Passo 3: Desenha o grid de fundo para dar sensação de espaço
    _drawBackground();

    // Passo 4: Desenha os corredores abaixo das salas
    _drawCorridors(_currentMap.corridors);

    // Passo 5: Desenha as salas com seus PNGs (ou fallback colorido)
    _drawRooms(_currentMap.rooms);

    // Passo 6: Desenha ícones e highlights sobre salas especiais/selecionadas
    _drawOverlays(_currentMap.rooms);

    // Passo 7: Desenha os pinos de anotação acima de tudo (incluindo salas)
    _drawPins();

    // Passo 8: Restaura a transformação original do contexto
    Camera.restore(_ctx);
  }

  // ---------------------------------------------------
  // redraw()
  // Re-renderiza o mapa atual sem receber novo mapa.
  // Chamada pela câmera ao mover ou fazer zoom.
  // ---------------------------------------------------
  function redraw() {
    draw();
  }

  // ---------------------------------------------------
  // _clear()
  // Limpa todo o canvas e preenche com a cor de fundo.
  // Usa as dimensões reais do canvas (não afetadas pela câmera).
  // ---------------------------------------------------
  function _clear() {
    // Limpa todos os pixels do canvas
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // Preenche com a cor de fundo definida no CONFIG
    _ctx.fillStyle = CONFIG.bgColor;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  }

  // ---------------------------------------------------
  // _drawBackground()
  // Desenha um grid de pontos na área do mapa para dar
  // sensação de espaço e profundidade ao usuário.
  // O grid é desenhado no espaço de coordenadas do mapa.
  // ---------------------------------------------------
  function _drawBackground() {
    const { gridCellSize, gridColor } = CONFIG;

    _ctx.fillStyle = gridColor;

    // Itera por todas as posições do grid dentro da área do mapa
    for (let x = 0; x <= _currentMap.width; x += gridCellSize) {
      for (let y = 0; y <= _currentMap.height; y += gridCellSize) {
        // Desenha um pequeno ponto em cada interseção do grid
        _ctx.beginPath();
        _ctx.arc(x, y, 1, 0, Math.PI * 2);
        _ctx.fill();
      }
    }
  }

  // ---------------------------------------------------
  // _drawCorridors(corridors)
  // Desenha todos os corredores como segmentos retangulares.
  // Cada corredor em L é desenhado como dois retângulos
  // conectados no ponto de cotovelo.
  //
  // @param {Corridor[]} corridors
  // ---------------------------------------------------
  function _drawCorridors(corridors) {
    if (!corridors || corridors.length === 0) return;

    _ctx.fillStyle = CONFIG.corridorColor;
    const halfWidth = CONFIG.corridorWidth / 2;

    corridors.forEach(corridor => {
      const pts = corridor.points;
      if (!pts || pts.length < 2) return;

      // Itera nos segmentos do corredor (do ponto i ao ponto i+1)
      for (let i = 0; i < pts.length - 1; i++) {
        const from = pts[i];
        const to   = pts[i + 1];

        // Determina os limites do retângulo para o segmento atual
        // Garante que x1 < x2 e y1 < y2 usando Math.min/max
        const x1 = Math.min(from.x, to.x) - halfWidth;
        const y1 = Math.min(from.y, to.y) - halfWidth;
        const w  = Math.abs(to.x - from.x) + CONFIG.corridorWidth;
        const h  = Math.abs(to.y - from.y) + CONFIG.corridorWidth;

        _ctx.fillRect(x1, y1, w, h);
      }
    });
  }

  // ---------------------------------------------------
  // _drawRooms(rooms)
  // Desenha cada sala com seu PNG correspondente.
  // Se a imagem não estiver disponível, usa um retângulo
  // colorido como fallback para garantir que o mapa seja
  // sempre visível mesmo sem assets.
  //
  // Prioridade de imagem por sala:
  //  1. room.userAsset.img  → imagem carregada pelo usuário
  //  2. AssetLoader.get(room.assetKey) → PNG estático do manifesto
  //  3. CONFIG.roomColors[room.type]   → retângulo colorido (fallback final)
  //
  // @param {Room[]} rooms
  // ---------------------------------------------------
  function _drawRooms(rooms) {
    rooms.forEach(room => {
      // Determina qual imagem usar seguindo a cadeia de prioridade:
      // user asset → asset estático → null (retângulo colorido)
      const img = (room.userAsset && room.userAsset.img)
        ? room.userAsset.img
        : (room.assetKey ? AssetLoader.get(room.assetKey) : null);

      if (img) {
        // Renderiza o PNG estendido para cobrir toda a sala
        _ctx.drawImage(img, room.x, room.y, room.width, room.height);
      } else {
        // Fallback: retângulo preenchido com cor baseada no tipo da sala
        _ctx.fillStyle = CONFIG.roomColors[room.type] || CONFIG.roomColors.normal;
        _ctx.fillRect(room.x, room.y, room.width, room.height);
      }

      // Desenha a borda da sala com cor e espessura do CONFIG
      _ctx.strokeStyle = CONFIG.roomBorderColor;
      _ctx.lineWidth   = CONFIG.roomBorderWidth;
      _ctx.strokeRect(room.x, room.y, room.width, room.height);

      // Destaca a sala selecionada com overlay semi-transparente
      if (_selectedRoom && _selectedRoom.id === room.id) {
        _ctx.fillStyle = CONFIG.highlightColor;
        _ctx.fillRect(room.x, room.y, room.width, room.height);

        // Borda mais espessa na sala selecionada para destaque visual
        _ctx.strokeStyle = '#ffffff';
        _ctx.lineWidth   = 3;
        _ctx.strokeRect(room.x, room.y, room.width, room.height);
      }
    });
  }

  // ---------------------------------------------------
  // _drawOverlays(rooms)
  // Desenha ícones de texto sobre salas especiais para
  // identificá-las visualmente no mapa.
  //
  //  - start → ícone PNG 'icon_start' ou emoji ▶
  //  - end   → ícone PNG 'icon_boss'  ou emoji ★ (objetivo final)
  //  - boss  → ícone PNG 'icon_boss'  ou emoji ☠
  //
  // @param {Room[]} rooms
  // ---------------------------------------------------
  function _drawOverlays(rooms) {
    // Mapa de emojis fallback por tipo de sala
    const fallbackIcons = {
      start: '▶',
      end:   '★',
      boss:  '☠',
    };

    // Mapa de chaves de ícones por tipo de sala
    const iconKeys = {
      start: 'icon_start',
      end:   'icon_boss',
      boss:  'icon_boss',
    };

    rooms.forEach(room => {
      // Pula salas normais sem ícone
      if (room.type === 'normal') return;

      // Centro da sala — onde o ícone será posicionado
      const cx = room.x + room.width  / 2;
      const cy = room.y + room.height / 2;

      // Tenta usar o PNG do ícone se disponível
      const iconKey = iconKeys[room.type];
      const iconImg = iconKey ? AssetLoader.get(iconKey) : null;

      if (iconImg) {
        // Tamanho do ícone: 40% da menor dimensão da sala
        const iconSize = Math.min(room.width, room.height) * 0.4;
        _ctx.drawImage(iconImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
      } else {
        // Fallback: emoji/texto centralizado sobre a sala
        _ctx.font      = `bold ${CONFIG.overlayFontSize}px monospace`;
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';

        // Sombra para melhorar legibilidade sobre imagens
        _ctx.shadowColor   = '#000000';
        _ctx.shadowBlur    = 4;
        _ctx.fillStyle     = '#ffffff';
        _ctx.fillText(fallbackIcons[room.type] || '?', cx, cy);

        // Reseta a sombra para não afetar outros desenhos
        _ctx.shadowBlur = 0;
      }

      // Desenha o nome do tipo da sala abaixo do ícone
      _ctx.font         = `10px monospace`;
      _ctx.textAlign    = 'center';
      _ctx.textBaseline = 'top';
      _ctx.fillStyle    = '#ffffff';
      _ctx.shadowColor  = '#000000';
      _ctx.shadowBlur   = 3;
      _ctx.fillText(room.type.toUpperCase(), cx, room.y + room.height + 4);
      _ctx.shadowBlur = 0;
    });
  }

  // ---------------------------------------------------
  // setPins(pins)
  // Atualiza a lista de pinos de anotação que será
  // desenhada sobre o mapa.  Chamada pelo main.js toda
  // vez que o PinManager notifica uma mudança.
  //
  // @param {Array<{id, x, y, label, note}>} pins
  // ---------------------------------------------------
  function setPins(pins) {
    // Preserva a referência ao array: os objetos dentro são compartilhados
    // com o PinManager, então updateSilent() refletirá nos rótulos imediatamente.
    _pins = pins;
  }

  // ---------------------------------------------------
  // _drawPins()
  // Desenha todos os pinos como marcadores "alfinete de mapa":
  //
  //   ○   ← círculo preenchido accent (centro em pin.y - 12)
  //   ▾   ← triângulo apontando para baixo até a ponta (pin.y)
  //   label acima do círculo
  //
  // Renderizado no espaço de coordenadas do mundo (após Camera.apply).
  // ---------------------------------------------------
  function _drawPins() {
    if (!_pins || _pins.length === 0) return;

    const PIN_COLOR       = '#5c6bff';   // accent color (pino pendente)
    const PIN_COLOR_DONE  = '#00cc66';   // verde (pino concluído)
    const PIN_OUTLINE     = '#ffffff';   // halo branco para contraste
    const CIRCLE_R        = 7;           // raio do círculo do pino
    const CIRCLE_CY       = 12;         // distância do círculo ao centróide Y

    _pins.forEach(pin => {
      const cx = pin.x;              // centro X do círculo
      const cy = pin.y - CIRCLE_CY;  // centro Y do círculo

      // Determina a cor com base no estado de conclusão
      const color = pin.completed ? PIN_COLOR_DONE : PIN_COLOR;

      // ── Halo branco: anel externo para realçar sobre fundos escuros
      _ctx.beginPath();
      _ctx.arc(cx, cy, CIRCLE_R + 2, 0, Math.PI * 2);
      _ctx.fillStyle = PIN_OUTLINE;
      _ctx.fill();

      // ── Corpo do pino: círculo preenchido
      _ctx.beginPath();
      _ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
      _ctx.fillStyle = color;
      _ctx.fill();

      // ── Agulha: triângulo apontando para baixo, de cy+CIRCLE_R até pin.y
      _ctx.beginPath();
      _ctx.moveTo(cx - 4, cy + CIRCLE_R - 1);
      _ctx.lineTo(cx + 4, cy + CIRCLE_R - 1);
      _ctx.lineTo(cx,     pin.y);
      _ctx.closePath();
      _ctx.fillStyle = color;
      _ctx.fill();

      // ── Ícone de check (✓) dentro do pino concluído
      if (pin.completed) {
        _ctx.font         = 'bold 9px monospace';
        _ctx.textAlign    = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillStyle    = '#ffffff';
        _ctx.fillText('✓', cx, cy);
      }

      // ── Rótulo do pino: texto acima do halo
      if (pin.label) {
        _ctx.font         = 'bold 9px monospace';
        _ctx.textAlign    = 'center';
        _ctx.textBaseline = 'bottom';

        // Sombra preta para legibilidade em qualquer fundo
        _ctx.shadowColor = '#000000';
        _ctx.shadowBlur  = 3;
        _ctx.fillStyle   = pin.completed ? '#00cc66' : '#ffffff';
        _ctx.fillText(pin.label, cx, cy - CIRCLE_R - 3);
        _ctx.shadowBlur  = 0;
      }
    });

    // Reseta alinhamentos de texto para não afetar outros métodos
    _ctx.textAlign    = 'left';
    _ctx.textBaseline = 'alphabetic';
  }

  // ---------------------------------------------------
  // highlightRoom(room)
  // Define a sala selecionada e redesenha o mapa com
  // o highlight ativo. Null remove o highlight.
  //
  // @param {Room | null} room  sala a destacar, ou null para limpar
  // ---------------------------------------------------
  function highlightRoom(room) {
    // Atualiza a referência da sala selecionada
    _selectedRoom = room;

    // Redesenha todo o mapa para aplicar o novo estado de highlight
    draw();
  }

  // ---------------------------------------------------
  // resizeCanvas()
  // Ajusta as dimensões do canvas para preencher o contêiner.
  // Deve ser chamada ao redimensionar a janela.
  // ---------------------------------------------------
  function resizeCanvas() {
    _resizeToContainer();
    draw(); // redesenha após o resize para evitar canvas em branco
  }

  // ---------------------------------------------------
  // _resizeToContainer()
  // Ajusta width/height do canvas ao tamanho do elemento pai (#canvas-wrapper).
  // ---------------------------------------------------
  function _resizeToContainer() {
    if (!_canvas) return;

    const wrapper = _canvas.parentElement;
    if (wrapper) {
      // Define as dimensões reais de pixel do canvas
      _canvas.width  = wrapper.clientWidth;
      _canvas.height = wrapper.clientHeight;
    }
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { init, draw, redraw, setPins, highlightRoom, resizeCanvas };

})();
