/**
 * camera.js — Controle de câmera (pan e zoom) no canvas
 *
 * Responsabilidades:
 *  - Rastrear offset (x, y) e escala (zoom)
 *  - Aplicar transformação no ctx antes de renderizar
 *  - Converter coordenadas de tela para coordenadas de mapa
 *  - Gerenciar input de mouse/touch para pan e zoom
 */

const Camera = (() => {

  // Estado interno da câmera
  const _state = {
    x:       0,      // offset horizontal atual
    y:       0,      // offset vertical atual
    zoom:    1.0,    // escala atual
    minZoom: 0.3,
    maxZoom: 3.0,
  };

  // Flag e posição para controle de drag
  let _isDragging  = false;
  let _dragStartX  = 0;
  let _dragStartY  = 0;

  // ---------------------------------------------------
  // init(canvas)
  // Registra eventos de mouse/touch no canvas.
  //
  // @param {HTMLCanvasElement} canvas
  // ---------------------------------------------------
  function init(canvas) {
    // TODO: canvas.addEventListener('mousedown', _onMouseDown)

    // TODO: canvas.addEventListener('mousemove', _onMouseMove)

    // TODO: canvas.addEventListener('mouseup', _onMouseUp)

    // TODO: canvas.addEventListener('wheel', _onWheel)

    // TODO: (opcional) adicionar suporte a touch (touchstart, touchmove, touchend)
  }

  // ---------------------------------------------------
  // apply(ctx)
  // Aplica as transformações da câmera no contexto.
  // Chamar antes de desenhar qualquer coisa no Renderer.
  // ---------------------------------------------------
  function apply(ctx) {
    // TODO: ctx.save()

    // TODO: ctx.translate(_state.x, _state.y)

    // TODO: ctx.scale(_state.zoom, _state.zoom)
  }

  // ---------------------------------------------------
  // restore(ctx)
  // Restaura o contexto após desenhar.
  // ---------------------------------------------------
  function restore(ctx) {
    // TODO: ctx.restore()
  }

  // ---------------------------------------------------
  // screenToWorld(screenX, screenY)
  // Converte coordenadas de tela (clique) para
  // coordenadas do mundo (mapa).
  //
  // @returns {{ x, y }}
  // ---------------------------------------------------
  function screenToWorld(screenX, screenY) {
    // TODO: aplicar inverso da transformação da câmera:
    //   worldX = (screenX - _state.x) / _state.zoom
    //   worldY = (screenY - _state.y) / _state.zoom
  }

  // ---------------------------------------------------
  // centerOn(x, y, canvasWidth, canvasHeight)
  // Move a câmera para centralizar no ponto (x, y) do mapa.
  // Útil para focar na sala inicial ao gerar o mapa.
  // ---------------------------------------------------
  function centerOn(x, y, canvasWidth, canvasHeight) {
    // TODO: calcular offset para centralizar (x, y) na tela
  }

  // ---------------------------------------------------
  // reset()
  // Volta câmera para posição e zoom iniciais.
  // ---------------------------------------------------
  function reset() {
    // TODO: resetar _state.x, _state.y, _state.zoom para defaults
  }

  // ---------------------------------------------------
  // _onMouseDown(event)
  // ---------------------------------------------------
  function _onMouseDown(event) {
    // TODO: ativar _isDragging e salvar posição inicial do drag
  }

  // ---------------------------------------------------
  // _onMouseMove(event)
  // ---------------------------------------------------
  function _onMouseMove(event) {
    // TODO: se _isDragging, calcular delta e atualizar _state.x / _state.y

    // TODO: chamar Renderer.draw() para atualizar a tela
  }

  // ---------------------------------------------------
  // _onMouseUp(event)
  // ---------------------------------------------------
  function _onMouseUp(event) {
    // TODO: desativar _isDragging
  }

  // ---------------------------------------------------
  // _onWheel(event)
  // Controla zoom com scroll do mouse.
  // ---------------------------------------------------
  function _onWheel(event) {
    // TODO: calcular novo zoom com base em event.deltaY

    // TODO: clamp entre _state.minZoom e _state.maxZoom

    // TODO: ajustar _state.x e _state.y para zoom centrado no cursor
    //       (zoom-to-cursor: mantém o ponto sob o cursor parado)

    // TODO: chamar Renderer.draw()
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { init, apply, restore, screenToWorld, centerOn, reset };

})();