/**
 * camera.js — Controle de câmera (pan e zoom) no canvas
 *
 * Responsabilidades:
 *  - Rastrear offset (x, y) e escala (zoom)
 *  - Aplicar transformação no ctx antes de renderizar
 *  - Converter coordenadas de tela para coordenadas de mapa
 *  - Gerenciar input de mouse para pan (arrastar) e zoom (scroll)
 *
 * Fluxo de transformação:
 *  - apply(ctx)  → ctx.save() → translate(x,y) → scale(zoom)
 *  - restore(ctx) → ctx.restore()
 *
 * Fórmula de "zoom centrado no cursor":
 *  Ao fazer zoom, o ponto do mapa sob o cursor deve permanecer fixo.
 *  Para isso, ajustamos o offset (x, y) compensando o zoom:
 *    newX = cursorX - (cursorX - oldX) * (newZoom / oldZoom)
 *    newY = cursorY - (cursorY - oldY) * (newZoom / oldZoom)
 */

const Camera = (() => {

  // Estado interno da câmera — toda a transformação é definida por estes valores
  const _state = {
    x:       0,     // deslocamento horizontal (pan) em pixels de tela
    y:       0,     // deslocamento vertical (pan) em pixels de tela
    zoom:    1.0,   // fator de escala atual (1.0 = 100%)
    minZoom: 0.3,   // zoom mínimo permitido (30%)
    maxZoom: 3.0,   // zoom máximo permitido (300%)
  };

  // Flag e posição inicial para controle do arrastar (pan com mouse)
  let _isDragging = false;
  let _dragStartX = 0;   // posição X do mouse ao iniciar o drag
  let _dragStartY = 0;   // posição Y do mouse ao iniciar o drag
  let _camStartX  = 0;   // valor de _state.x no início do drag
  let _camStartY  = 0;   // valor de _state.y no início do drag

  // Referência ao canvas para uso nos event handlers
  // (precisamos dela para calcular o bounding rect nos eventos de wheel)
  let _canvas = null;

  // Referência ao Renderer.draw para acionar re-renderização ao mover câmera
  // Será atribuída na função init para evitar acoplamento circular
  let _onChangeCallback = null;

  // ---------------------------------------------------
  // init(canvas, onChangeCallback)
  // Registra todos os event listeners de mouse no canvas.
  // Deve ser chamada uma vez na inicialização da aplicação.
  //
  // @param {HTMLCanvasElement} canvas
  // @param {Function} onChangeCallback  função chamada ao mover/zoom a câmera
  // ---------------------------------------------------
  function init(canvas, onChangeCallback) {
    // Armazena referências para uso posterior nos handlers
    _canvas           = canvas;
    _onChangeCallback = onChangeCallback || function () {};

    // Registra os eventos de mouse para pan e zoom
    canvas.addEventListener('mousedown',  _onMouseDown);
    canvas.addEventListener('mousemove',  _onMouseMove);
    canvas.addEventListener('mouseup',    _onMouseUp);
    canvas.addEventListener('mouseleave', _onMouseUp);   // cancela drag ao sair do canvas
    canvas.addEventListener('wheel',      _onWheel, { passive: false }); // passive:false para preventDefault

    // Muda o cursor para indicar que o canvas é arrastável
    canvas.style.cursor = 'grab';
  }

  // ---------------------------------------------------
  // apply(ctx)
  // Salva o estado do contexto e aplica as transformações
  // da câmera (translação + escala) para que todo o desenho
  // subsequente seja feito no espaço de coordenadas do mapa.
  //
  // IMPORTANTE: sempre chame restore(ctx) após terminar de desenhar.
  //
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function apply(ctx) {
    // Salva a matriz de transformação atual para restaurar depois
    ctx.save();

    // Aplica o deslocamento de pan (move a origem do sistema de coordenadas)
    ctx.translate(_state.x, _state.y);

    // Aplica o fator de zoom (escala o espaço de coordenadas)
    ctx.scale(_state.zoom, _state.zoom);
  }

  // ---------------------------------------------------
  // restore(ctx)
  // Restaura o estado do contexto ao que era antes de apply().
  // Deve ser chamada após todo o desenho do mapa.
  //
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function restore(ctx) {
    // Restaura a matriz de transformação salva por apply()
    ctx.restore();
  }

  // ---------------------------------------------------
  // screenToWorld(screenX, screenY)
  // Converte coordenadas de tela (ex.: posição de clique)
  // para coordenadas do mundo/mapa, levando em conta
  // o pan e zoom atuais da câmera.
  //
  // Inversão da transformação:
  //   worldX = (screenX - offsetX) / zoom
  //   worldY = (screenY - offsetY) / zoom
  //
  // @param {number} screenX  coordenada X em pixels de tela
  // @param {number} screenY  coordenada Y em pixels de tela
  // @returns {{ x: number, y: number }}
  // ---------------------------------------------------
  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - _state.x) / _state.zoom,
      y: (screenY - _state.y) / _state.zoom,
    };
  }

  // ---------------------------------------------------
  // centerOn(worldX, worldY, canvasWidth, canvasHeight)
  // Reposiciona a câmera para centralizar o ponto
  // (worldX, worldY) do mapa no centro da tela.
  // Útil para focar na sala de início ao gerar um novo mapa.
  //
  // @param {number} worldX        coordenada X no espaço do mapa
  // @param {number} worldY        coordenada Y no espaço do mapa
  // @param {number} canvasWidth
  // @param {number} canvasHeight
  // ---------------------------------------------------
  function centerOn(worldX, worldY, canvasWidth, canvasHeight) {
    // Calcula o offset necessário para que (worldX, worldY) fique no centro da tela
    // Fórmula: offset = centroTela - (posicaoMundo * zoom)
    _state.x = canvasWidth  / 2 - worldX * _state.zoom;
    _state.y = canvasHeight / 2 - worldY * _state.zoom;
  }

  // ---------------------------------------------------
  // reset()
  // Volta a câmera para o estado inicial: sem deslocamento
  // e com zoom padrão (1.0 = 100%).
  // ---------------------------------------------------
  function reset() {
    _state.x    = 0;
    _state.y    = 0;
    _state.zoom = 1.0;
  }

  // ---------------------------------------------------
  // _onMouseDown(event)
  // Inicia o pan: marca o início do drag e salva a
  // posição inicial do mouse e da câmera.
  // ---------------------------------------------------
  function _onMouseDown(event) {
    // Apenas o botão esquerdo inicia o drag
    if (event.button !== 0) return;

    _isDragging = true;
    _dragStartX = event.clientX;  // posição inicial do cursor (tela)
    _dragStartY = event.clientY;
    _camStartX  = _state.x;       // posição inicial da câmera
    _camStartY  = _state.y;

    // Muda o cursor para indicar que está arrastando
    if (_canvas) _canvas.style.cursor = 'grabbing';
  }

  // ---------------------------------------------------
  // _onMouseMove(event)
  // Atualiza o offset da câmera enquanto o botão está pressionado.
  // Calcula o delta entre a posição atual e inicial do drag.
  // ---------------------------------------------------
  function _onMouseMove(event) {
    // Só atualiza se estiver em modo de drag
    if (!_isDragging) return;

    // Calcula o quanto o mouse se moveu desde o início do drag
    const deltaX = event.clientX - _dragStartX;
    const deltaY = event.clientY - _dragStartY;

    // Aplica o deslocamento à posição inicial da câmera (não acumula delta)
    _state.x = _camStartX + deltaX;
    _state.y = _camStartY + deltaY;

    // Notifica o Renderer para redesenhar com a nova posição
    _onChangeCallback();
  }

  // ---------------------------------------------------
  // _onMouseUp(event)
  // Finaliza o pan ao soltar o botão do mouse.
  // ---------------------------------------------------
  function _onMouseUp() {
    _isDragging = false;

    // Restaura o cursor padrão de mão aberta
    if (_canvas) _canvas.style.cursor = 'grab';
  }

  // ---------------------------------------------------
  // _onWheel(event)
  // Controla o zoom com a roda do mouse.
  //
  // Implementa "zoom centrado no cursor":
  // O ponto do mapa sob o cursor permanece fixo durante o zoom,
  // ajustando o offset para compensar a mudança de escala.
  // ---------------------------------------------------
  function _onWheel(event) {
    // Previne o scroll da página ao fazer zoom no canvas
    event.preventDefault();

    // Fator de zoom por passo da roda do mouse
    // deltaY > 0 = scroll para baixo = afastar (zoom out)
    // deltaY < 0 = scroll para cima  = aproximar (zoom in)
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Calcula o novo zoom respeitando os limites mínimo e máximo
    const newZoom = MathUtils.clamp(
      _state.zoom * zoomFactor,
      _state.minZoom,
      _state.maxZoom
    );

    // Calcula a posição do cursor relativa ao canvas (não à janela)
    const rect    = _canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    // Ajusta o offset para manter o ponto sob o cursor parado
    // Derivação: worldPontoCursor = (cursor - offset) / zoom
    // Após zoom: newOffset = cursor - worldPontoCursor * newZoom
    _state.x = cursorX - (cursorX - _state.x) * (newZoom / _state.zoom);
    _state.y = cursorY - (cursorY - _state.y) * (newZoom / _state.zoom);
    _state.zoom = newZoom;

    // Notifica o Renderer para redesenhar com o novo zoom
    _onChangeCallback();
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { init, apply, restore, screenToWorld, centerOn, reset };

})();
