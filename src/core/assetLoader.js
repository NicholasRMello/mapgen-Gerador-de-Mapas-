/**
 * assetLoader.js — PNG loading and caching
 *
 * Responsibilities:
 *  - Load all PNGs from /assets/* folders
 *  - Make images available to Renderer and MapGenerator
 *  - Populate visual slots in the sidebar panel
 *
 * Asset catalog structure:
 * Edit ASSET_MANIFEST to register your PNGs.
 * Format: { key: string, path: string, group: string }
 */

const AssetLoader = (() => {

  // ---------------------------------------------------
  // ASSET_MANIFEST
  // List of all PNGs used in the map.
  // 'key'   → identifier used by MapGenerator
  // 'path'  → relative path from index.html
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

  // Internal cache: maps key → loaded HTMLImageElement
  const _cache = {};

  // ---------------------------------------------------
  // load()
  // Loads all assets from ASSET_MANIFEST in parallel.
  // Each PNG is loaded via new Image() with promisification.
  // Images that fail to load (file not found) are silently
  // ignored so they don't block the application.
  //
  // @returns {Promise<object>}  resolves with the complete cache
  // ---------------------------------------------------
  function load() {
    // Create a Promise for each manifest item
    const promises = ASSET_MANIFEST.map(item => {
      return new Promise(resolve => {
        const img = new Image();

        // On successful load, store in cache and resolve
        img.onload = () => {
          _cache[item.key] = img;
          resolve();
        };

        // On error (file does not exist), resolve without storing
        // so it doesn't block Promise.all
        img.onerror = () => {
          console.warn(`[AssetLoader] Failed to load: ${item.path}`);
          resolve();
        };

        // Start loading by setting the src
        img.src = item.path;
      });
    });

    // Wait for all loads (with or without errors) and populate the sidebar
    return Promise.all(promises).then(() => {
      _populateSidebar();
      return _cache;
    });
  }

  // ---------------------------------------------------
  // get(key)
  // Returns the HTMLImageElement by manifest key.
  // Returns null and logs a warning if the key does not exist.
  //
  // @param {string} key
  // @returns {HTMLImageElement | null}
  // ---------------------------------------------------
  function get(key) {
    // Look up in cache by identifier
    const img = _cache[key];

    // Warn in console if the image was not found or failed to load
    if (!img) {
      console.warn(`[AssetLoader] Asset not found in cache: "${key}"`);
      return null;
    }

    return img;
  }

  // ---------------------------------------------------
  // getByGroup(group)
  // Returns all loaded assets from a specific group.
  // Useful for listing all available room types.
  //
  // @param {string} group  'rooms' | 'tiles' | 'ui'
  // @returns {{ key: string, img: HTMLImageElement }[]}
  // ---------------------------------------------------
  function getByGroup(group) {
    // Filter the manifest by group and return only those that loaded successfully
    return ASSET_MANIFEST
      .filter(item => item.group === group)
      .filter(item => _cache[item.key])           // only those in cache
      .map(item => ({ key: item.key, img: _cache[item.key] }));
  }

  // ---------------------------------------------------
  // getKeys(group)
  // Returns only the keys of a specific group.
  // Used by MapGenerator to randomly pick assets
  // when assigning a visual to each generated room.
  //
  // @param {string} group
  // @returns {string[]}
  // ---------------------------------------------------
  function getKeys(group) {
    // Filter by group and return only the keys of loaded assets
    return ASSET_MANIFEST
      .filter(item => item.group === group && _cache[item.key])
      .map(item => item.key);
  }

  // ---------------------------------------------------
  // _populateSidebar()
  // Creates .asset-slot elements with <img> inside the
  // HTML grids to display thumbnails of loaded PNGs.
  // Called automatically at the end of load().
  // ---------------------------------------------------
  function _populateSidebar() {
    // Iterate over the three asset groups
    ['rooms', 'tiles', 'ui'].forEach(group => {
      // Locate the corresponding grid in the HTML (e.g., #slots-rooms)
      const grid = document.getElementById(`slots-${group}`);
      if (!grid) return;

      // Clear old slots in case load() is called again
      grid.innerHTML = '';

      // Get all loaded assets from the current group
      const assets = getByGroup(group);

      assets.forEach(({ key, img }) => {
        // Create the slot container
        const slot = document.createElement('div');
        slot.className  = 'asset-slot';
        slot.title      = key;            // tooltip with the key name

        // Create the thumbnail image
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.alt = key;

        // Add the label with the key below the image
        const label = document.createElement('span');
        label.textContent = key;

        // Assemble the slot and insert into the grid
        slot.appendChild(thumb);
        slot.appendChild(label);
        grid.appendChild(slot);
      });
    });
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { load, get, getByGroup, getKeys };

})();
