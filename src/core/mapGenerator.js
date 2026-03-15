/**
 * mapGenerator.js — Procedural generation core
 *
 * Responsibilities:
 *  - Create the map data structure (rooms + corridors)
 *  - Position rooms on a virtual grid to avoid corridor crossings
 *  - Expose the generated map to the Renderer and CorridorBuilder
 *
 * Expected structure of a map:
 * {
 *   seed:      string,
 *   width:     number,   // total width of the generation area in pixels
 *   height:    number,   // total height of the generation area in pixels
 *   rooms:     Room[],
 *   corridors: Corridor[],
 * }
 *
 * Structure of a Room:
 * {
 *   id:          number,
 *   x:           number,
 *   y:           number,
 *   width:       number,
 *   height:      number,
 *   assetKey:    string | null,   // static key from AssetLoader (fallback without user assets)
 *   userAsset:   object | null,   // object { id, name, img, type } from UserAssets
 *   type:        string,          // 'start' | 'end' | 'normal' | 'boss'
 *   connections: number[],        // ids of rooms connected by corridor
 * }
 */

const MapGenerator = (() => {

  // ---------------------------------------------------
  // Default settings — adjust as needed
  // ---------------------------------------------------
  const DEFAULTS = {
    roomCount:      { small: 5, medium: 10, large: 20 },
    mapWidth:       2000,  // total width of the generation area (px)
    mapHeight:      1500,  // total height of the generation area (px)
    minRoomSize:    80,    // minimum room size (px)
    maxRoomSize:    160,   // maximum room size (px)
    corridorMargin: 60,    // margin reserved on each cell edge for corridors
    //
    // corridorMargin is the key to the grid positioning system:
    // the map is divided into cells; each room sits inside its cell
    // with this margin on all sides. This ensures that corridors
    // between adjacent cells pass BETWEEN rooms, never THROUGH them.
  };

  // ---------------------------------------------------
  // generate(options) — main public function
  //
  // Applies the seed, determines the room count based on
  // the chosen size, generates and returns the complete map.
  //
  // @param {object} options
  //   - seed       {string}  randomness seed
  //   - size       {string}  'small' | 'medium' | 'large'
  //   - assets     {object}  reference to AssetLoader (static fallback)
  //   - userAssets {object}  reference to UserAssets (user images)
  //
  // @returns {object} complete map with rooms and corridors
  // ---------------------------------------------------
  function generate(options) {
    // Initialize the pseudorandom generator with the provided seed
    // to ensure the same seed always produces the same map
    Random.seed(options.seed);

    // Determine the room count based on the selected size
    const size  = options.size || 'medium';
    const count = DEFAULTS.roomCount[size] || DEFAULTS.roomCount.medium;

    // Position rooms on a virtual grid (guaranteed no overlap)
    const rooms = _placeRooms(count);

    // Define special types (start, end, boss) BEFORE assigning images
    // so that the correct image is chosen for each type
    _markSpecialRooms(rooms);

    // Assign an image to each room (user asset -> assetLoader -> null)
    _assignRoomAssets(rooms, options.userAssets, options.assets);

    // Build corridors connecting all rooms via MST
    const corridors = CorridorBuilder.build(rooms);

    return {
      seed:      options.seed,
      width:     DEFAULTS.mapWidth,
      height:    DEFAULTS.mapHeight,
      rooms,
      corridors,
    };
  }

  // ---------------------------------------------------
  // _placeRooms(count)
  // Positions rooms using a VIRTUAL GRID system.
  //
  // How it works:
  //  1. The map is divided into cols x rows cells — each room
  //     gets an exclusive cell chosen randomly.
  //  2. Within each cell, the room is positioned with a margin of
  //     DEFAULTS.corridorMargin on all sides.
  //  3. This margin is the corridor "channel": it ensures that any
  //     corridor between adjacent cells passes BETWEEN rooms,
  //     never THROUGH a room.
  //
  // Grid layouts by room count:
  //   small  (5)  -> 3x2 = 6  cells -> ~667x750 px per cell
  //   medium (10) -> 4x3 = 12 cells -> ~500x500 px per cell
  //   large  (20) -> 5x4 = 20 cells -> ~400x375 px per cell
  //
  // @param {number} count  number of rooms to generate
  // @returns {Room[]}
  // ---------------------------------------------------
  function _placeRooms(count) {
    // Calculate grid dimensions using the map's aspect ratio
    // to create approximately square cells
    const cols = Math.ceil(Math.sqrt(count * DEFAULTS.mapWidth / DEFAULTS.mapHeight));
    const rows = Math.ceil(count / cols);

    // Size of each cell in pixels
    const cellW = DEFAULTS.mapWidth  / cols;
    const cellH = DEFAULTS.mapHeight / rows;

    // Create all cell positions (col, row) and shuffle them
    // for random but deterministic distribution via seed
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ col: c, row: r });
      }
    }
    Random.shuffle(cells);

    const m     = DEFAULTS.corridorMargin;
    const rooms = [];

    for (let i = 0; i < count && i < cells.length; i++) {
      const { col, row } = cells[i];

      // Top-left corner of the cell in pixels
      const cellLeft = col * cellW;
      const cellTop  = row * cellH;

      // Maximum room size constrained within the cell minus the margins
      const maxW = Math.max(DEFAULTS.minRoomSize, Math.floor(cellW - 2 * m));
      const maxH = Math.max(DEFAULTS.minRoomSize, Math.floor(cellH - 2 * m));

      const w = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxW));
      const h = Random.int(DEFAULTS.minRoomSize, Math.min(DEFAULTS.maxRoomSize, maxH));

      // Available space for position variation within the cell
      // (cell space - room size - margin on both sides)
      const xSpace = cellW - w - 2 * m;
      const ySpace = cellH - h - 2 * m;

      // Random position within the cell margins
      // If there is no remaining space, center the room in the cell
      const x = Math.round(cellLeft + m + (xSpace > 0 ? Random.float(0, xSpace) : xSpace / 2));
      const y = Math.round(cellTop  + m + (ySpace > 0 ? Random.float(0, ySpace) : ySpace / 2));

      rooms.push({
        id:          i,
        x,
        y,
        width:       w,
        height:      h,
        assetKey:    null,     // filled by _assignRoomAssets
        userAsset:   null,     // filled by _assignRoomAssets
        type:        'normal', // adjusted by _markSpecialRooms
        connections: [],       // filled by CorridorBuilder
      });
    }

    return rooms;
  }

  // ---------------------------------------------------
  // _markSpecialRooms(rooms)
  // Defines the special types of rooms after positioning.
  //
  //  - 'start' -> first room in the array (player entry point)
  //  - 'end'   -> room farthest from the starting room (final objective)
  //  - 'boss'  -> normal room farthest from start (mini-boss)
  //
  // @param {Room[]} rooms  array of rooms (modified in-place)
  // ---------------------------------------------------
  function _markSpecialRooms(rooms) {
    if (rooms.length === 0) return;

    // The first generated room is always the starting point
    rooms[0].type = 'start';

    if (rooms.length === 1) return;

    // Calculate the center of the starting room as a distance reference
    const startCenter = MathUtils.rectCenter(rooms[0]);

    // Find the room farthest from start -> end room
    let farthestRoom     = rooms[1];
    let farthestDistance = 0;

    rooms.forEach(room => {
      if (room.id === rooms[0].id) return;

      const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
      if (dist > farthestDistance) {
        farthestDistance = dist;
        farthestRoom     = room;
      }
    });

    farthestRoom.type = 'end';

    // Mark a boss room if there are enough rooms (>= 3 rooms)
    if (rooms.length >= 3) {
      let bossRoom     = null;
      let bestDistance = 0;

      rooms.forEach(room => {
        // Only consider normal rooms (not start or end)
        if (room.type !== 'normal') return;

        const dist = MathUtils.distance(startCenter, MathUtils.rectCenter(room));
        if (dist > bestDistance) {
          bestDistance = dist;
          bossRoom     = room;
        }
      });

      if (bossRoom) bossRoom.type = 'boss';
    }
  }

  // ---------------------------------------------------
  // _assignRoomAssets(rooms, userAssets, assetLoader)
  // Assigns the correct image to each room AFTER types
  // have already been defined by _markSpecialRooms().
  //
  // Priority chain:
  //  1. UserAssets with type === room.type  (exact match)
  //  2. UserAssets with type === 'any'       (user wildcard)
  //  3. AssetLoader.getKeys('rooms')         (static PNGs from manifest)
  //  4. null                                 (renderer uses colored rectangle)
  //
  // Random.pick() ensures deterministic selection via seed.
  //
  // @param {Room[]} rooms
  // @param {object} userAssets  UserAssets module (can be null)
  // @param {object} assetLoader AssetLoader module (static fallback)
  // ---------------------------------------------------
  function _assignRoomAssets(rooms, userAssets, assetLoader) {
    const hasUserAssets = userAssets && userAssets.hasAny();

    // Pre-load static keys only if there are no user assets
    const staticKeys = (assetLoader && !hasUserAssets)
      ? assetLoader.getKeys('rooms')
      : [];

    rooms.forEach(room => {
      if (hasUserAssets) {
        // getByType() already applies fallback to 'any' internally
        const candidates = userAssets.getByType(room.type);
        if (candidates.length > 0) {
          room.userAsset = Random.pick(candidates);
        }
      } else {
        if (staticKeys.length > 0) {
          room.assetKey = Random.pick(staticKeys);
        }
      }
    });
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { generate };

})();
