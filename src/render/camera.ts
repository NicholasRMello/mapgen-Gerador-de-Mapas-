import { MathUtils } from '../utils/math.ts';

export const Camera = (() => {
  const _state = {
    x: 0,
    y: 0,
    zoom: 1.0,
    minZoom: 0.3,
    maxZoom: 3.0,
  };

  let _isDragging = false;
  let _dragStartX = 0;
  let _dragStartY = 0;
  let _camStartX = 0;
  let _camStartY = 0;

  let _canvas: HTMLCanvasElement | null = null;
  let _onChangeCallback: () => void = () => {};

  function init(canvas: HTMLCanvasElement, onChangeCallback?: () => void) {
    _canvas = canvas;
    _onChangeCallback = onChangeCallback || (() => {});

    canvas.addEventListener('mousedown', _onMouseDown);
    canvas.addEventListener('mousemove', _onMouseMove);
    canvas.addEventListener('mouseup', _onMouseUp);
    canvas.addEventListener('mouseleave', _onMouseUp);
    canvas.addEventListener('wheel', _onWheel, { passive: false });

    canvas.style.cursor = 'grab';
  }

  function apply(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(_state.x, _state.y);
    ctx.scale(_state.zoom, _state.zoom);
  }

  function restore(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  }

  function screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - _state.x) / _state.zoom,
      y: (screenY - _state.y) / _state.zoom,
    };
  }

  function centerOn(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number) {
    _state.x = canvasWidth / 2 - worldX * _state.zoom;
    _state.y = canvasHeight / 2 - worldY * _state.zoom;
  }

  function reset() {
    _state.x = 0;
    _state.y = 0;
    _state.zoom = 1.0;
  }

  function _onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    _isDragging = true;
    _dragStartX = event.clientX;
    _dragStartY = event.clientY;
    _camStartX = _state.x;
    _camStartY = _state.y;
    if (_canvas) _canvas.style.cursor = 'grabbing';
  }

  function _onMouseMove(event: MouseEvent) {
    if (!_isDragging) return;
    const deltaX = event.clientX - _dragStartX;
    const deltaY = event.clientY - _dragStartY;
    _state.x = _camStartX + deltaX;
    _state.y = _camStartY + deltaY;
    _onChangeCallback();
  }

  function _onMouseUp() {
    _isDragging = false;
    if (_canvas) _canvas.style.cursor = 'grab';
  }

  function _onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = MathUtils.clamp(_state.zoom * zoomFactor, _state.minZoom, _state.maxZoom);

    const rect = (_canvas as HTMLCanvasElement).getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    _state.x = cursorX - (cursorX - _state.x) * (newZoom / _state.zoom);
    _state.y = cursorY - (cursorY - _state.y) * (newZoom / _state.zoom);
    _state.zoom = newZoom;

    _onChangeCallback();
  }

  return { init, apply, restore, screenToWorld, centerOn, reset };
})();
