import { AssetLoader } from '../core/assetLoader.ts';
import type { GeneratedMap, Pin, Room } from '../types.ts';
import { Camera } from './camera.ts';

export const Renderer = (() => {
  let _canvas: HTMLCanvasElement | null = null;
  let _ctx: CanvasRenderingContext2D | null = null;
  let _currentMap: GeneratedMap | null = null;
  let _selectedRoom: Room | null = null;
  let _pins: Pin[] = [];

  const CONFIG = {
    corridorColor: '#3a4acc',
    corridorWidth: 16,
    roomBorderColor: '#5c6bff',
    roomBorderWidth: 2,
    bgColor: '#0e0f14',
    gridColor: 'rgba(42, 45, 58, 0.6)',
    gridCellSize: 40,
    highlightColor: 'rgba(92, 107, 255, 0.4)',
    roomColors: {
      start: '#00ff88',
      end: '#ff6b6b',
      boss: '#ffaa00',
      normal: '#2a2d3a',
    },
    overlayFontSize: 18,
  };

  function init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    _canvas = canvas;
    _ctx = ctx;
    _resizeToContainer();
  }

  function draw(map?: GeneratedMap | null) {
    if (map !== undefined) _currentMap = map;
    _clear();
    if (!_currentMap || !_ctx) return;

    Camera.apply(_ctx);
    _drawBackground();
    _drawCorridors(_currentMap.corridors);
    _drawRooms(_currentMap.rooms);
    _drawOverlays(_currentMap.rooms);
    _drawPins();
    Camera.restore(_ctx);
  }

  function redraw() {
    draw();
  }

  function _clear() {
    if (!_ctx || !_canvas) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.fillStyle = CONFIG.bgColor;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  }

  function _drawBackground() {
    if (!_ctx || !_currentMap) return;
    const { gridCellSize, gridColor } = CONFIG;
    _ctx.fillStyle = gridColor;

    for (let x = 0; x <= _currentMap.width; x += gridCellSize) {
      for (let y = 0; y <= _currentMap.height; y += gridCellSize) {
        _ctx.beginPath();
        _ctx.arc(x, y, 1, 0, Math.PI * 2);
        _ctx.fill();
      }
    }
  }

  function _drawCorridors(corridors: GeneratedMap['corridors']) {
    if (!_ctx || !corridors || corridors.length === 0) return;

    _ctx.fillStyle = CONFIG.corridorColor;
    const halfWidth = CONFIG.corridorWidth / 2;

    corridors.forEach((corridor) => {
      const pts = corridor.points;
      if (!pts || pts.length < 2) return;

      for (let i = 0; i < pts.length - 1; i++) {
        const from = pts[i];
        const to = pts[i + 1];

        const x1 = Math.min(from.x, to.x) - halfWidth;
        const y1 = Math.min(from.y, to.y) - halfWidth;
        const w = Math.abs(to.x - from.x) + CONFIG.corridorWidth;
        const h = Math.abs(to.y - from.y) + CONFIG.corridorWidth;

        _ctx.fillRect(x1, y1, w, h);
      }
    });
  }

  function _drawRooms(rooms: Room[]) {
    if (!_ctx) return;

    rooms.forEach((room) => {
      const img = room.userAsset?.img ? room.userAsset.img : room.assetKey ? AssetLoader.get(room.assetKey) : null;

      if (img) {
        _ctx.drawImage(img, room.x, room.y, room.width, room.height);
      } else {
        _ctx.fillStyle = CONFIG.roomColors[room.type] || CONFIG.roomColors.normal;
        _ctx.fillRect(room.x, room.y, room.width, room.height);
      }

      _ctx.strokeStyle = CONFIG.roomBorderColor;
      _ctx.lineWidth = CONFIG.roomBorderWidth;
      _ctx.strokeRect(room.x, room.y, room.width, room.height);

      if (_selectedRoom && _selectedRoom.id === room.id) {
        _ctx.fillStyle = CONFIG.highlightColor;
        _ctx.fillRect(room.x, room.y, room.width, room.height);
        _ctx.strokeStyle = '#ffffff';
        _ctx.lineWidth = 3;
        _ctx.strokeRect(room.x, room.y, room.width, room.height);
      }
    });
  }

  function _drawOverlays(rooms: Room[]) {
    if (!_ctx) return;

    const fallbackIcons: Record<string, string> = {
      start: '▶',
      end: '★',
      boss: '☠',
    };

    const iconKeys: Record<string, string> = {
      start: 'icon_start',
      end: 'icon_boss',
      boss: 'icon_boss',
    };

    rooms.forEach((room) => {
      if (room.type === 'normal') return;
      const cx = room.x + room.width / 2;
      const cy = room.y + room.height / 2;
      const iconKey = iconKeys[room.type];
      const iconImg = iconKey ? AssetLoader.get(iconKey) : null;

      if (iconImg) {
        const iconSize = Math.min(room.width, room.height) * 0.4;
        _ctx!.drawImage(iconImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
      } else {
        _ctx!.font = `bold ${CONFIG.overlayFontSize}px monospace`;
        _ctx!.textAlign = 'center';
        _ctx!.textBaseline = 'middle';
        _ctx!.shadowColor = '#000000';
        _ctx!.shadowBlur = 4;
        _ctx!.fillStyle = '#ffffff';
        _ctx!.fillText(fallbackIcons[room.type] || '?', cx, cy);
        _ctx!.shadowBlur = 0;
      }

      _ctx!.font = '10px monospace';
      _ctx!.textAlign = 'center';
      _ctx!.textBaseline = 'top';
      _ctx!.fillStyle = '#ffffff';
      _ctx!.shadowColor = '#000000';
      _ctx!.shadowBlur = 3;
      _ctx!.fillText(room.type.toUpperCase(), cx, room.y + room.height + 4);
      _ctx!.shadowBlur = 0;
    });
  }

  function setPins(pins: Pin[]) {
    _pins = pins;
  }

  function _drawPins() {
    if (!_ctx || !_pins || _pins.length === 0) return;

    const PIN_COLOR = '#5c6bff';
    const PIN_COLOR_DONE = '#00cc66';
    const PIN_OUTLINE = '#ffffff';
    const CIRCLE_R = 7;
    const CIRCLE_CY = 12;

    _pins.forEach((pin) => {
      const cx = pin.x;
      const cy = pin.y - CIRCLE_CY;
      const color = pin.completed ? PIN_COLOR_DONE : PIN_COLOR;

      _ctx!.beginPath();
      _ctx!.arc(cx, cy, CIRCLE_R + 2, 0, Math.PI * 2);
      _ctx!.fillStyle = PIN_OUTLINE;
      _ctx!.fill();

      _ctx!.beginPath();
      _ctx!.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
      _ctx!.fillStyle = color;
      _ctx!.fill();

      _ctx!.beginPath();
      _ctx!.moveTo(cx - 4, cy + CIRCLE_R - 1);
      _ctx!.lineTo(cx + 4, cy + CIRCLE_R - 1);
      _ctx!.lineTo(cx, pin.y);
      _ctx!.closePath();
      _ctx!.fillStyle = color;
      _ctx!.fill();

      if (pin.completed) {
        _ctx!.font = 'bold 9px monospace';
        _ctx!.textAlign = 'center';
        _ctx!.textBaseline = 'middle';
        _ctx!.fillStyle = '#ffffff';
        _ctx!.fillText('✓', cx, cy);
      }

      if (pin.label) {
        _ctx!.font = 'bold 9px monospace';
        _ctx!.textAlign = 'center';
        _ctx!.textBaseline = 'bottom';
        _ctx!.shadowColor = '#000000';
        _ctx!.shadowBlur = 3;
        _ctx!.fillStyle = pin.completed ? '#00cc66' : '#ffffff';
        _ctx!.fillText(pin.label, cx, cy - CIRCLE_R - 3);
        _ctx!.shadowBlur = 0;
      }
    });

    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
  }

  function highlightRoom(room: Room | null) {
    _selectedRoom = room;
    draw();
  }

  function resizeCanvas() {
    _resizeToContainer();
    draw();
  }

  function _resizeToContainer() {
    if (!_canvas) return;
    const wrapper = _canvas.parentElement;
    if (wrapper) {
      _canvas.width = wrapper.clientWidth;
      _canvas.height = wrapper.clientHeight;
    }
  }

  return { init, draw, redraw, setPins, highlightRoom, resizeCanvas };
})();
