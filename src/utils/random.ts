export const Random = (() => {
  let _state: (() => number) | null = null;

  function mulberry32(a: number) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str: string) {
    const len = str.length;
    let hash = 5381;
    for (let idx = 0; idx < len; ++idx) {
      hash = 33 * hash + str.charCodeAt(idx);
    }
    return hash;
  }

  function seed(value: string | number) {
    let numeric = typeof value === 'string' ? hashString(value) : value;
    numeric = numeric >>> 0;
    _state = mulberry32(numeric);
  }

  function next() {
    if (!_state) seed(Date.now());
    return (_state as () => number)();
  }

  function int(min: number, max: number) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function float(min: number, max: number) {
    return min + (max - min) * next();
  }

  function pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[int(0, array.length - 1)];
  }

  function shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function generateSeedString() {
    const adjectives = ['CAVE', 'DARK', 'MYSTIC', 'ANCIENT', 'HIDDEN'];
    const noun = adjectives[Math.floor(Math.random() * adjectives.length)];
    const number = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${noun}-${number}`;
  }

  return { seed, next, int, float, pick, shuffle, generateSeedString };
})();
