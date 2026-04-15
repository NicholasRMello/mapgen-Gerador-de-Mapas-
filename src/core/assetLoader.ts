type AssetItem = {
  key: string;
  path: string;
  group: 'rooms' | 'tiles' | 'ui';
};

export const AssetLoader = (() => {
  const ASSET_MANIFEST: AssetItem[] = [
    { key: 'room_cave', path: 'assets/rooms/cave.png', group: 'rooms' },
    { key: 'room_dungeon', path: 'assets/rooms/dungeon.png', group: 'rooms' },
    { key: 'tile_floor', path: 'assets/tiles/floor.png', group: 'tiles' },
    { key: 'tile_wall', path: 'assets/tiles/wall.png', group: 'tiles' },
    { key: 'icon_start', path: 'assets/ui/start.png', group: 'ui' },
    { key: 'icon_boss', path: 'assets/ui/boss.png', group: 'ui' },
  ];

  const _cache: Record<string, HTMLImageElement> = {};

  function load() {
    const promises = ASSET_MANIFEST.map((item) => {
      return new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = () => {
          _cache[item.key] = img;
          resolve();
        };

        img.onerror = () => {
          console.warn(`[AssetLoader] Failed to load: ${item.path}`);
          resolve();
        };

        img.src = item.path;
      });
    });

    return Promise.all(promises).then(() => _cache);
  }

  function get(key: string) {
    const img = _cache[key];
    if (!img) {
      console.warn(`[AssetLoader] Asset not found in cache: "${key}"`);
      return null;
    }
    return img;
  }

  function getByGroup(group: AssetItem['group']) {
    return ASSET_MANIFEST.filter((item) => item.group === group)
      .filter((item) => _cache[item.key])
      .map((item) => ({ key: item.key, img: _cache[item.key] }));
  }

  function getKeys(group: AssetItem['group']) {
    return ASSET_MANIFEST.filter((item) => item.group === group && _cache[item.key]).map((item) => item.key);
  }

  return { load, get, getByGroup, getKeys };
})();
