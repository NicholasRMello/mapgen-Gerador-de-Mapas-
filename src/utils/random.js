/**
 * random.js — Gerador pseudoaleatório com seed
 *
 * Por quê seed?
 *  - Permite reproduzir o mesmo mapa dado o mesmo seed
 *  - Facilita debug (sempre o mesmo resultado)
 *  - Usuário pode compartilhar seeds interessantes
 *
 * Algoritmo sugerido: Mulberry32 (simples, rápido, seedável)
 * Alternativa: xoshiro128**, LCG, etc.
 */

const Random = (() => {

  let _state = 0;  // estado interno do gerador

  // algoritmo mulberry32 para gerar números pseudoaleatórios a partir de um seed.
  function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

  // função simples para converter string em número (hash)
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
  // Define o seed antes de gerar um mapa.
  //
  // @param {string | number} value
  // ---------------------------------------------------
  function seed(value) {
    // TODO: se value é string, converter para número
    //       (ex.: hash simples da string)

    // TODO: inicializar _state com o valor numérico do seed

    _state = typeof value === 'string' ? hashString(value) : value;
    _state = _state >>> 0; // garantir que seja um inteiro positivo de 32 bits
    _state = mulberry32(_state); // guardar a função dentro de _state para gerar números pseudoaleatórios
    
  
  }

  // ---------------------------------------------------
  // next()
  // Retorna um float pseudoaleatório no intervalo [0, 1).
  // Equivalente ao Math.random(), mas determinístico.
  //
  // @returns {number}
  // ---------------------------------------------------
  function next() {
    // TODO: implementar step do algoritmo escolhido (ex. Mulberry32)
    //       e retornar valor normalizado entre 0 e 1
    return _state();

  }

  // ---------------------------------------------------
  // int(min, max)
  // Retorna inteiro aleatório entre min e max (inclusive).
  //
  // @returns {number}
  // ---------------------------------------------------
  function int(min, max) {
    // TODO: usar next() e mapear para [min, max]
    return Math.floor(next() * (max - min + 1)) + min;
  }

  // ---------------------------------------------------
  // float(min, max)
  // Retorna float aleatório entre min (inclusive) e max (exclusivo).
  //
  // @returns {number}
  // ---------------------------------------------------
  function float(min, max) {
    // TODO: usar next() e mapear para [min, max)
    return min + (max - min) * next();
  }

  // ---------------------------------------------------
  // pick(array)
  // Retorna um elemento aleatório de um array.
  //
  // @returns {*}
  // ---------------------------------------------------
  function pick(array) {
    // TODO: gerar índice aleatório e retornar array[índice]

    if (array.length === 0) {
      return undefined; // ou lançar erro, dependendo do comportamento desejado
    }
    return array[int(0, array.length - 1)];

  }

  // ---------------------------------------------------
  // shuffle(array)
  // Embaralha o array in-place (Fisher-Yates).
  //
  // @returns {Array}  o mesmo array embaralhado
  // ---------------------------------------------------
  function shuffle(array) {
    // TODO: implementar Fisher-Yates usando next()

    for (let i = array.length - 1; i > 0; i--) {
      const j = int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ---------------------------------------------------
  // generateSeedString()
  // Gera uma seed legível aleatória para exibir no header.
  // Ex.: "CAVE-4821", "DARK-0042"
  //
  // @returns {string}
  // ---------------------------------------------------
  function generateSeedString() {
    // TODO: combinar palavra aleatória + número aleatório
    //       usando Math.random() (não precisa ser seedável aqui)

    const adjectives = ['CAVE', 'DARK', 'MYSTIC', 'ANCIENT', 'HIDDEN'];
    const noun = adjectives[Math.floor(Math.random() * adjectives.length)];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${noun}-${number}`;
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { seed, next, int, float, pick, shuffle, generateSeedString };

})();