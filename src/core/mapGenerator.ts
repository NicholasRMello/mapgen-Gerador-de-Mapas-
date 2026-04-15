import type { GeneratedMap, Room } from '../types.ts';
import { MathUtils } from '../utils/math.ts';
import { Random } from '../utils/random.ts';
import { CorridorBuilder } from './corridorBuilder.ts';
import { AssetLoader } from './assetLoader.ts';
import { UserAssets } from './userAssets.ts';

export const MapGenerator = (() => {
  const DEFAULTS = {
    roomCount: { small: 5, medium: 10, large: 20 },
    mapWidth: 2000,
    mapHeight: 1500,
    minRoomSize: 80,
    maxRoomSize: 160,
    corridorMargin: 60,
  };

  function generate(options: {
    seed: string;
    size: 'small' | 'medium' | 'large';
    assets: typeof AssetLoader;
    userAssets: typeof UserAssets;
  }): GeneratedMap {
    Random.seed(options.seed);

    const size = options.size || 'medium';
    const count = DEFAULTS.roomCount[size] || DEFAULTS.roomCount.medium;

    const rooms = _placeRooms(count);
    _markSpecialRooms(rooms);
    _assignRoomAssets(rooms, options.userAssets, options.assets);

    const corridors = CorridorBuilder.build(rooms);

    return {
      seed: options.seed,
      width: DEFAULTS.mapWidth,
      height: DEFAULTS.mapHeight,
      rooms,
      corridors,
    };
  }

  function _placeRooms(count: number): Room[] {
    const cols = Math.ceil(Math.sqrt((count * DEFAULTS.mapWidth) / DEFAULTS.mapHeight));
    const rows = Math.ceil(count / cols);

    const cellW = DEFAULTS.mapWidth / cols;
    const cellH = DEFAULTS.mapHeight / rows;

    const cells: Array<{ col: number; row: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ col: c, row: r });
      }
    }
    Random.shuffle(cells);

    const m = DEFAULTS.corridorMargin;
    const rooms: Room[] = [];

    for (let i = 0; i < count && i < cells.length; i++) {
      const { col, row } = cells[i];
      const cellLeft = col * cellW;
      const cellTop = row * cellH;

      const maxW = Math.max(DEFAULTS.minRoomSize, Math.floor(cellW - 2 * m));
      const maxH = Math.max(DEFAULTS.minRoomSize, Math.floor(cellH - 2 * m));

      const w = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxW));
      const h = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxH));

      const xSpace = cellW - w - 2 * m;
      const ySpace = cellH - h - 2 * m;

      const x = Math.round(cellLeft + m + (xSpace > 0 ? Random.float(0, xSpace) : xSpace / 2));
      const y = Math.round(cellTop + m + (ySpace > 0 ? Random.float(0, ySpace) : ySpace / 2));

      rooms.push({
        id: i,
        x,
        y,
        width: w,
        height: h,
        assetKey: null,
        userAsset: null,
        type: 'normal',
        connections: [],
      });
    }

    return rooms;
  }

  function _markSpecialRooms(rooms: Room[]) {
    if (rooms.length === 0) return;
    rooms[0].type = 'start';
    if (rooms.length === 1) return;

    const startCenter = MathUtils.rectCenter(rooms[0]);

    let farthestRoom = rooms[1];
    let farthestDistance = 0;

    rooms.forEach((room) => {
      if (room.id === rooms[0].id) return;
      const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
      if (dist > farthestDistance) {
        farthestDistance = dist;
        farthestRoom = room;
      }
    });

    farthestRoom.type = 'end';

    if (rooms.length >= 3) {
      let bossRoom: Room | null = null;
      let bestDistance = 0;

      rooms.forEach((room) => {
        if (room.type !== 'normal') return;
        const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
        if (dist > bestDistance) {
          bestDistance = dist;
          bossRoom = room;
        }
      });

      if (bossRoom) bossRoom.type = 'boss';
    }
  }

  function _assignRoomAssets(rooms: Room[], userAssets: typeof UserAssets, assetLoader: typeof AssetLoader) {
    const hasUserAssets = userAssets && userAssets.hasAny();
    const staticKeys = assetLoader && !hasUserAssets ? assetLoader.getKeys('rooms') : [];

    rooms.forEach((room) => {
      if (hasUserAssets) {
        const candidates = userAssets.getByType(room.type);
        if (candidates.length > 0) room.userAsset = Random.pick(candidates) || null;
      } else if (staticKeys.length > 0) {
        room.assetKey = Random.pick(staticKeys) || null;
      }
    });
  }

  return { generate };
})();
