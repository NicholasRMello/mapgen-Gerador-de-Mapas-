/**
 * random.js — Seeded pseudorandom number generator
 *
 * Why seed?
 *  - Allows reproducing the same map given the same seed
 *  - Facilitates debugging (always the same result)
 *  - Users can share interesting seeds
 *
 * Suggested algorithm: Mulberry32 (simple, fast, seedable)
 * Alternative: xoshiro128**, LCG, etc.
 */

const Random = (() => {

  let _state = 0;  // internal generator state

  // Mulberry32 algorithm to generate pseudorandom numbers from a seed.
  function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

  // Simple function to convert a string into a number (hash)
  function hashString(str) {
    var len = str.length;
    var hash = 5381;
    for (var idx = 0; idx < len; ++idx) {
      hash = 33 * hash + str.charCodeAt(idx);
    }
    return hash;
  }



  // ---------------------------------------------------
  // seed(value)
  // Sets the seed before generating a map.
  //
  // @param {string | number} value
  // ---------------------------------------------------
  function seed(value) {
    // TODO: if value is a string, convert to number
    //       (e.g.: simple hash of the string)

    // TODO: initialize _state with the numeric seed value

    _state = typeof value === 'string' ? hashString(value) : value;
    _state = _state >>> 0; // ensure it is a positive 32-bit integer
    _state = mulberry32(_state); // store the function in _state to generate pseudorandom numbers


  }

  // ---------------------------------------------------
  // next()
  // Returns a pseudorandom float in the range [0, 1).
  // Equivalent to Math.random(), but deterministic.
  //
  // @returns {number}
  // ---------------------------------------------------
  function next() {
    // TODO: implement the chosen algorithm step (e.g. Mulberry32)
    //       and return a normalized value between 0 and 1
    return _state();

  }

  // ---------------------------------------------------
  // int(min, max)
  // Returns a random integer between min and max (inclusive).
  //
  // @returns {number}
  // ---------------------------------------------------
  function int(min, max) {
    // TODO: use next() and map to [min, max]
    return Math.floor(next() * (max - min + 1)) + min;
  }

  // ---------------------------------------------------
  // float(min, max)
  // Returns a random float between min (inclusive) and max (exclusive).
  //
  // @returns {number}
  // ---------------------------------------------------
  function float(min, max) {
    // TODO: use next() and map to [min, max)
    return min + (max - min) * next();
  }

  // ---------------------------------------------------
  // pick(array)
  // Returns a random element from an array.
  //
  // @returns {*}
  // ---------------------------------------------------
  function pick(array) {
    // TODO: generate a random index and return array[index]

    if (array.length === 0) {
      return undefined; // or throw an error, depending on the desired behavior
    }
    return array[int(0, array.length - 1)];

  }

  // ---------------------------------------------------
  // shuffle(array)
  // Shuffles the array in-place (Fisher-Yates).
  //
  // @returns {Array}  the same shuffled array
  // ---------------------------------------------------
  function shuffle(array) {
    // TODO: implement Fisher-Yates using next()

    for (let i = array.length - 1; i > 0; i--) {
      const j = int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ---------------------------------------------------
  // generateSeedString()
  // Generates a readable random seed to display in the header.
  // E.g.: "CAVE-4821", "DARK-0042"
  //
  // @returns {string}
  // ---------------------------------------------------
  function generateSeedString() {
    // TODO: combine a random word + random number
    //       using Math.random() (does not need to be seedable here)

    const adjectives = ['CAVE', 'DARK', 'MYSTIC', 'ANCIENT', 'HIDDEN'];
    const noun = adjectives[Math.floor(Math.random() * adjectives.length)];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${noun}-${number}`;
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { seed, next, int, float, pick, shuffle, generateSeedString };

})();
