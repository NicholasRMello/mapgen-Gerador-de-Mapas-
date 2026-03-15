/**
 * camera.js — Camera control (pan and zoom) on the canvas
 *
 * Responsibilities:
 *  - Track offset (x, y) and scale (zoom)
 *  - Apply transformation to ctx before rendering
 *  - Convert screen coordinates to map coordinates
 *  - Manage mouse input for pan (drag) and zoom (scroll)
 *
 * Transformation flow:
 *  - apply(ctx)  → ctx.save() → translate(x,y) → scale(zoom)
 *  - restore(ctx) → ctx.restore()
 *
 * "Cursor-centered zoom" formula:
 *  When zooming, the map point under the cursor must remain fixed.
 *  To achieve this, we adjust the offset (x, y) to compensate for the zoom:
 *    newX = cursorX - (cursorX - oldX) * (newZoom / oldZoom)
 *    newY = cursorY - (cursorY - oldY) * (newZoom / oldZoom)
 */

const Camera = (() => {

  // Internal camera state — the entire transformation is defined by these values
  const _state = {
    x:       0,     // horizontal offset (pan) in screen pixels
    y:       0,     // vertical offset (pan) in screen pixels
    zoom:    1.0,   // current scale factor (1.0 = 100%)
    minZoom: 0.3,   // minimum allowed zoom (30%)
    maxZoom: 3.0,   // maximum allowed zoom (300%)
  };

  // Flag and initial position for drag control (mouse pan)
  let _isDragging = false;
  let _dragStartX = 0;   // mouse X position when drag started
  let _dragStartY = 0;   // mouse Y position when drag started
  let _camStartX  = 0;   // _state.x value at drag start
  let _camStartY  = 0;   // _state.y value at drag start

  // Reference to the canvas for use in event handlers
  // (needed to calculate the bounding rect in wheel events)
  let _canvas = null;

  // Reference to Renderer.draw to trigger re-rendering when the camera moves
  // Will be assigned in the init function to avoid circular coupling
  let _onChangeCallback = null;

  // ---------------------------------------------------
  // init(canvas, onChangeCallback)
  // Registers all mouse event listeners on the canvas.
  // Must be called once during application initialization.
  //
  // @param {HTMLCanvasElement} canvas
  // @param {Function} onChangeCallback  function called on camera move/zoom
  // ---------------------------------------------------
  function init(canvas, onChangeCallback) {
    // Store references for later use in handlers
    _canvas           = canvas;
    _onChangeCallback = onChangeCallback || function () {};

    // Register mouse events for pan and zoom
    canvas.addEventListener('mousedown',  _onMouseDown);
    canvas.addEventListener('mousemove',  _onMouseMove);
    canvas.addEventListener('mouseup',    _onMouseUp);
    canvas.addEventListener('mouseleave', _onMouseUp);   // cancel drag when leaving the canvas
    canvas.addEventListener('wheel',      _onWheel, { passive: false }); // passive:false for preventDefault

    // Change cursor to indicate the canvas is draggable
    canvas.style.cursor = 'grab';
  }

  // ---------------------------------------------------
  // apply(ctx)
  // Saves the context state and applies camera
  // transformations (translation + scale) so that all
  // subsequent drawing is done in the map coordinate space.
  //
  // IMPORTANT: always call restore(ctx) after finishing drawing.
  //
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function apply(ctx) {
    // Save the current transformation matrix to restore later
    ctx.save();

    // Apply the pan offset (move the coordinate system origin)
    ctx.translate(_state.x, _state.y);

    // Apply the zoom factor (scale the coordinate space)
    ctx.scale(_state.zoom, _state.zoom);
  }

  // ---------------------------------------------------
  // restore(ctx)
  // Restores the context state to what it was before apply().
  // Must be called after all map drawing is complete.
  //
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function restore(ctx) {
    // Restore the transformation matrix saved by apply()
    ctx.restore();
  }

  // ---------------------------------------------------
  // screenToWorld(screenX, screenY)
  // Converts screen coordinates (e.g., click position)
  // to world/map coordinates, accounting for the current
  // camera pan and zoom.
  //
  // Transformation inversion:
  //   worldX = (screenX - offsetX) / zoom
  //   worldY = (screenY - offsetY) / zoom
  //
  // @param {number} screenX  X coordinate in screen pixels
  // @param {number} screenY  Y coordinate in screen pixels
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
  // Repositions the camera to center the map point
  // (worldX, worldY) in the middle of the screen.
  // Useful for focusing on the start room when generating a new map.
  //
  // @param {number} worldX        X coordinate in map space
  // @param {number} worldY        Y coordinate in map space
  // @param {number} canvasWidth
  // @param {number} canvasHeight
  // ---------------------------------------------------
  function centerOn(worldX, worldY, canvasWidth, canvasHeight) {
    // Calculate the offset needed so (worldX, worldY) is at the screen center
    // Formula: offset = screenCenter - (worldPosition * zoom)
    _state.x = canvasWidth  / 2 - worldX * _state.zoom;
    _state.y = canvasHeight / 2 - worldY * _state.zoom;
  }

  // ---------------------------------------------------
  // reset()
  // Returns the camera to its initial state: no offset
  // and default zoom (1.0 = 100%).
  // ---------------------------------------------------
  function reset() {
    _state.x    = 0;
    _state.y    = 0;
    _state.zoom = 1.0;
  }

  // ---------------------------------------------------
  // _onMouseDown(event)
  // Starts the pan: marks the drag start and saves
  // the initial mouse and camera positions.
  // ---------------------------------------------------
  function _onMouseDown(event) {
    // Only the left button starts the drag
    if (event.button !== 0) return;

    _isDragging = true;
    _dragStartX = event.clientX;  // initial cursor position (screen)
    _dragStartY = event.clientY;
    _camStartX  = _state.x;       // initial camera position
    _camStartY  = _state.y;

    // Change cursor to indicate dragging is in progress
    if (_canvas) _canvas.style.cursor = 'grabbing';
  }

  // ---------------------------------------------------
  // _onMouseMove(event)
  // Updates the camera offset while the button is pressed.
  // Calculates the delta between the current and initial drag position.
  // ---------------------------------------------------
  function _onMouseMove(event) {
    // Only update if in drag mode
    if (!_isDragging) return;

    // Calculate how much the mouse has moved since the drag started
    const deltaX = event.clientX - _dragStartX;
    const deltaY = event.clientY - _dragStartY;

    // Apply the offset to the initial camera position (does not accumulate delta)
    _state.x = _camStartX + deltaX;
    _state.y = _camStartY + deltaY;

    // Notify the Renderer to redraw with the new position
    _onChangeCallback();
  }

  // ---------------------------------------------------
  // _onMouseUp(event)
  // Ends the pan when the mouse button is released.
  // ---------------------------------------------------
  function _onMouseUp() {
    _isDragging = false;

    // Restore the default open-hand cursor
    if (_canvas) _canvas.style.cursor = 'grab';
  }

  // ---------------------------------------------------
  // _onWheel(event)
  // Controls zoom with the mouse wheel.
  //
  // Implements "cursor-centered zoom":
  // The map point under the cursor stays fixed during zoom,
  // adjusting the offset to compensate for the scale change.
  // ---------------------------------------------------
  function _onWheel(event) {
    // Prevent page scrolling when zooming on the canvas
    event.preventDefault();

    // Zoom factor per mouse wheel step
    // deltaY > 0 = scroll down = zoom out
    // deltaY < 0 = scroll up   = zoom in
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Calculate the new zoom respecting minimum and maximum limits
    const newZoom = MathUtils.clamp(
      _state.zoom * zoomFactor,
      _state.minZoom,
      _state.maxZoom
    );

    // Calculate the cursor position relative to the canvas (not the window)
    const rect    = _canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    // Adjust the offset to keep the point under the cursor stationary
    // Derivation: worldCursorPoint = (cursor - offset) / zoom
    // After zoom: newOffset = cursor - worldCursorPoint * newZoom
    _state.x = cursorX - (cursorX - _state.x) * (newZoom / _state.zoom);
    _state.y = cursorY - (cursorY - _state.y) * (newZoom / _state.zoom);
    _state.zoom = newZoom;

    // Notify the Renderer to redraw with the new zoom
    _onChangeCallback();
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { init, apply, restore, screenToWorld, centerOn, reset };

})();
