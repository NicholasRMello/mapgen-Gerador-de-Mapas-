/**
 * renderer.js — Map rendering on Canvas 2D
 *
 * Responsibilities:
 *  - Draw corridors (rectangles between room centers)
 *  - Draw rooms (PNGs via drawImage or colored fallback)
 *  - Apply camera transformations (pan + zoom)
 *  - Highlight special rooms with icons and colored borders
 *
 * Drawing flow (painter's algorithm — back → front):
 *  1. Clear canvas with background color
 *  2. Apply camera transformation (Camera.apply)
 *  3. Draw background with dot grid
 *  4. Draw corridors (below rooms)
 *  5. Draw rooms (PNGs or fallback rectangles)
 *  6. Draw overlays (start/end/boss icons, selection highlight)
 *  7. Draw annotation pins (on top of everything)
 *  8. Restore transformation (Camera.restore)
 */

const Renderer = (() => {

  // References to canvas and 2D context, set in init()
  let _canvas = null;
  let _ctx    = null;

  // Current map stored to allow re-rendering when moving the camera
  let _currentMap = null;

  // Room selected by user click (for highlight)
  let _selectedRoom = null;

  // List of annotation pins to render — updated via setPins()
  let _pins = [];

  // Visual settings — adjust to customize appearance
  const CONFIG = {
    corridorColor:   '#3a4acc',              // corridor fill color
    corridorWidth:   16,                     // corridor thickness in px
    roomBorderColor: '#5c6bff',              // default room border
    roomBorderWidth: 2,                      // room border thickness in px
    bgColor:         '#0e0f14',              // canvas background color
    gridColor:       'rgba(42, 45, 58, 0.6)', // background grid dot color
    gridCellSize:    40,                     // grid cell size in px
    highlightColor:  'rgba(92, 107, 255, 0.4)', // highlight color when selecting a room

    // Border colors by room type — used even without PNG
    roomColors: {
      start:  '#00ff88',  // green for start room
      end:    '#ff6b6b',  // red for end room
      boss:   '#ffaa00',  // orange for boss room
      normal: '#2a2d3a',  // dark gray for normal rooms
    },

    // Size of text icons drawn over special rooms
    overlayFontSize: 18,
  };

  // ---------------------------------------------------
  // init(canvas, ctx)
  // Sets up the renderer with canvas and context references.
  // Must be called once before any draw().
  //
  // @param {HTMLCanvasElement}        canvas
  // @param {CanvasRenderingContext2D} ctx
  // ---------------------------------------------------
  function init(canvas, ctx) {
    // Store references for use in all drawing methods
    _canvas = canvas;
    _ctx    = ctx;

    // Resize the canvas to fill its container on initialization
    _resizeToContainer();
  }

  // ---------------------------------------------------
  // draw(map)
  // Redraws the entire map from scratch following painter's algorithm order.
  // Saves the current map to allow re-renders when moving the camera.
  //
  // @param {object} map  object returned by MapGenerator.generate()
  //                      Can be null to just clear the canvas.
  // ---------------------------------------------------
  function draw(map) {
    // Store the map to allow redrawing without receiving it again
    if (map !== undefined) _currentMap = map;

    // Step 1: Clear the canvas with the background color
    _clear();

    // Without a map, just show the clean background
    if (!_currentMap) return;

    // Step 2: Apply camera transformations (pan + zoom)
    Camera.apply(_ctx);

    // Step 3: Draw the background grid for a sense of space
    _drawBackground();

    // Step 4: Draw corridors below rooms
    _drawCorridors(_currentMap.corridors);

    // Step 5: Draw rooms with their PNGs (or colored fallback)
    _drawRooms(_currentMap.rooms);

    // Step 6: Draw icons and highlights over special/selected rooms
    _drawOverlays(_currentMap.rooms);

    // Step 7: Draw annotation pins on top of everything (including rooms)
    _drawPins();

    // Step 8: Restore the original context transformation
    Camera.restore(_ctx);
  }

  // ---------------------------------------------------
  // redraw()
  // Re-renders the current map without receiving a new one.
  // Called by the camera when panning or zooming.
  // ---------------------------------------------------
  function redraw() {
    draw();
  }

  // ---------------------------------------------------
  // _clear()
  // Clears the entire canvas and fills it with the background color.
  // Uses the actual canvas dimensions (not affected by the camera).
  // ---------------------------------------------------
  function _clear() {
    // Clear all canvas pixels
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // Fill with the background color defined in CONFIG
    _ctx.fillStyle = CONFIG.bgColor;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  }

  // ---------------------------------------------------
  // _drawBackground()
  // Draws a dot grid over the map area to give the user
  // a sense of space and depth.
  // The grid is drawn in the map coordinate space.
  // ---------------------------------------------------
  function _drawBackground() {
    const { gridCellSize, gridColor } = CONFIG;

    _ctx.fillStyle = gridColor;

    // Iterate through all grid positions within the map area
    for (let x = 0; x <= _currentMap.width; x += gridCellSize) {
      for (let y = 0; y <= _currentMap.height; y += gridCellSize) {
        // Draw a small dot at each grid intersection
        _ctx.beginPath();
        _ctx.arc(x, y, 1, 0, Math.PI * 2);
        _ctx.fill();
      }
    }
  }

  // ---------------------------------------------------
  // _drawCorridors(corridors)
  // Draws all corridors as rectangular segments.
  // Each L-shaped corridor is drawn as two rectangles
  // connected at the elbow point.
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

      // Iterate through corridor segments (from point i to point i+1)
      for (let i = 0; i < pts.length - 1; i++) {
        const from = pts[i];
        const to   = pts[i + 1];

        // Determine the rectangle bounds for the current segment
        // Ensure x1 < x2 and y1 < y2 using Math.min/max
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
  // Draws each room with its corresponding PNG.
  // If the image is not available, uses a colored
  // rectangle as fallback to ensure the map is always
  // visible even without assets.
  //
  // Image priority per room:
  //  1. room.userAsset.img  → user-uploaded image
  //  2. AssetLoader.get(room.assetKey) → static PNG from manifest
  //  3. CONFIG.roomColors[room.type]   → colored rectangle (final fallback)
  //
  // @param {Room[]} rooms
  // ---------------------------------------------------
  function _drawRooms(rooms) {
    rooms.forEach(room => {
      // Determine which image to use following the priority chain:
      // user asset → static asset → null (colored rectangle)
      const img = (room.userAsset && room.userAsset.img)
        ? room.userAsset.img
        : (room.assetKey ? AssetLoader.get(room.assetKey) : null);

      if (img) {
        // Render the PNG stretched to cover the entire room
        _ctx.drawImage(img, room.x, room.y, room.width, room.height);
      } else {
        // Fallback: filled rectangle with color based on room type
        _ctx.fillStyle = CONFIG.roomColors[room.type] || CONFIG.roomColors.normal;
        _ctx.fillRect(room.x, room.y, room.width, room.height);
      }

      // Draw the room border with color and thickness from CONFIG
      _ctx.strokeStyle = CONFIG.roomBorderColor;
      _ctx.lineWidth   = CONFIG.roomBorderWidth;
      _ctx.strokeRect(room.x, room.y, room.width, room.height);

      // Highlight the selected room with a semi-transparent overlay
      if (_selectedRoom && _selectedRoom.id === room.id) {
        _ctx.fillStyle = CONFIG.highlightColor;
        _ctx.fillRect(room.x, room.y, room.width, room.height);

        // Thicker border on the selected room for visual emphasis
        _ctx.strokeStyle = '#ffffff';
        _ctx.lineWidth   = 3;
        _ctx.strokeRect(room.x, room.y, room.width, room.height);
      }
    });
  }

  // ---------------------------------------------------
  // _drawOverlays(rooms)
  // Draws text icons over special rooms to visually
  // identify them on the map.
  //
  //  - start → PNG icon 'icon_start' or emoji ▶
  //  - end   → PNG icon 'icon_boss'  or emoji ★ (final objective)
  //  - boss  → PNG icon 'icon_boss'  or emoji ☠
  //
  // @param {Room[]} rooms
  // ---------------------------------------------------
  function _drawOverlays(rooms) {
    // Fallback emoji map by room type
    const fallbackIcons = {
      start: '▶',
      end:   '★',
      boss:  '☠',
    };

    // Icon key map by room type
    const iconKeys = {
      start: 'icon_start',
      end:   'icon_boss',
      boss:  'icon_boss',
    };

    rooms.forEach(room => {
      // Skip normal rooms without icons
      if (room.type === 'normal') return;

      // Room center — where the icon will be positioned
      const cx = room.x + room.width  / 2;
      const cy = room.y + room.height / 2;

      // Try to use the PNG icon if available
      const iconKey = iconKeys[room.type];
      const iconImg = iconKey ? AssetLoader.get(iconKey) : null;

      if (iconImg) {
        // Icon size: 40% of the room's smallest dimension
        const iconSize = Math.min(room.width, room.height) * 0.4;
        _ctx.drawImage(iconImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
      } else {
        // Fallback: emoji/text centered over the room
        _ctx.font      = `bold ${CONFIG.overlayFontSize}px monospace`;
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';

        // Shadow to improve readability over images
        _ctx.shadowColor   = '#000000';
        _ctx.shadowBlur    = 4;
        _ctx.fillStyle     = '#ffffff';
        _ctx.fillText(fallbackIcons[room.type] || '?', cx, cy);

        // Reset shadow so it doesn't affect other drawings
        _ctx.shadowBlur = 0;
      }

      // Draw the room type name below the icon
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
  // Updates the list of annotation pins that will be
  // drawn over the map. Called by main.js every time
  // the PinManager notifies a change.
  //
  // @param {Array<{id, x, y, label, note}>} pins
  // ---------------------------------------------------
  function setPins(pins) {
    // Preserve the reference to the array: the objects inside are shared
    // with the PinManager, so updateSilent() will reflect on labels immediately.
    _pins = pins;
  }

  // ---------------------------------------------------
  // _drawPins()
  // Draws all pins as "map pin" markers:
  //
  //   ○   ← filled accent circle (center at pin.y - 12)
  //   ▾   ← downward-pointing triangle to the tip (pin.y)
  //   label above the circle
  //
  // Rendered in world coordinate space (after Camera.apply).
  // ---------------------------------------------------
  function _drawPins() {
    if (!_pins || _pins.length === 0) return;

    const PIN_COLOR       = '#5c6bff';   // accent color (pending pin)
    const PIN_COLOR_DONE  = '#00cc66';   // green (completed pin)
    const PIN_OUTLINE     = '#ffffff';   // white halo for contrast
    const CIRCLE_R        = 7;           // pin circle radius
    const CIRCLE_CY       = 12;         // distance from circle to centroid Y

    _pins.forEach(pin => {
      const cx = pin.x;              // circle center X
      const cy = pin.y - CIRCLE_CY;  // circle center Y

      // Determine color based on completion state
      const color = pin.completed ? PIN_COLOR_DONE : PIN_COLOR;

      // -- White halo: outer ring to stand out over dark backgrounds
      _ctx.beginPath();
      _ctx.arc(cx, cy, CIRCLE_R + 2, 0, Math.PI * 2);
      _ctx.fillStyle = PIN_OUTLINE;
      _ctx.fill();

      // -- Pin body: filled circle
      _ctx.beginPath();
      _ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
      _ctx.fillStyle = color;
      _ctx.fill();

      // -- Needle: downward-pointing triangle, from cy+CIRCLE_R to pin.y
      _ctx.beginPath();
      _ctx.moveTo(cx - 4, cy + CIRCLE_R - 1);
      _ctx.lineTo(cx + 4, cy + CIRCLE_R - 1);
      _ctx.lineTo(cx,     pin.y);
      _ctx.closePath();
      _ctx.fillStyle = color;
      _ctx.fill();

      // -- Check icon (✓) inside the completed pin
      if (pin.completed) {
        _ctx.font         = 'bold 9px monospace';
        _ctx.textAlign    = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillStyle    = '#ffffff';
        _ctx.fillText('✓', cx, cy);
      }

      // -- Pin label: text above the halo
      if (pin.label) {
        _ctx.font         = 'bold 9px monospace';
        _ctx.textAlign    = 'center';
        _ctx.textBaseline = 'bottom';

        // Black shadow for readability on any background
        _ctx.shadowColor = '#000000';
        _ctx.shadowBlur  = 3;
        _ctx.fillStyle   = pin.completed ? '#00cc66' : '#ffffff';
        _ctx.fillText(pin.label, cx, cy - CIRCLE_R - 3);
        _ctx.shadowBlur  = 0;
      }
    });

    // Reset text alignments so they don't affect other methods
    _ctx.textAlign    = 'left';
    _ctx.textBaseline = 'alphabetic';
  }

  // ---------------------------------------------------
  // highlightRoom(room)
  // Sets the selected room and redraws the map with
  // the highlight active. Null removes the highlight.
  //
  // @param {Room | null} room  room to highlight, or null to clear
  // ---------------------------------------------------
  function highlightRoom(room) {
    // Update the selected room reference
    _selectedRoom = room;

    // Redraw the entire map to apply the new highlight state
    draw();
  }

  // ---------------------------------------------------
  // resizeCanvas()
  // Adjusts canvas dimensions to fill its container.
  // Should be called when the window is resized.
  // ---------------------------------------------------
  function resizeCanvas() {
    _resizeToContainer();
    draw(); // redraw after resize to avoid a blank canvas
  }

  // ---------------------------------------------------
  // _resizeToContainer()
  // Adjusts canvas width/height to the size of the parent element (#canvas-wrapper).
  // ---------------------------------------------------
  function _resizeToContainer() {
    if (!_canvas) return;

    const wrapper = _canvas.parentElement;
    if (wrapper) {
      // Set the actual pixel dimensions of the canvas
      _canvas.width  = wrapper.clientWidth;
      _canvas.height = wrapper.clientHeight;
    }
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { init, draw, redraw, setPins, highlightRoom, resizeCanvas };

})();
