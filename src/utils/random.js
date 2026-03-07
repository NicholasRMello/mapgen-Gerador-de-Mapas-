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
  }

  // ---------------------------------------------------
  // int(min, max)
  // Retorna inteiro aleatório entre min e max (inclusive).
  //
  // @returns {number}
  // ---------------------------------------------------
  function int(min, max) {
    // TODO: usar next() e mapear para [min, max]
  }

  // ---------------------------------------------------
  // float(min, max)
  // Retorna float aleatório entre min (inclusive) e max (exclusivo).
  //
  // @returns {number}
  // ---------------------------------------------------
  function float(min, max) {
    // TODO: usar next() e mapear para [min, max)
  }

  // ---------------------------------------------------
  // pick(array)
  // Retorna um elemento aleatório de um array.
  //
  // @returns {*}
  // ---------------------------------------------------
  function pick(array) {
    // TODO: gerar índice aleatório e retornar array[índice]
  }

  // ---------------------------------------------------
  // shuffle(array)
  // Embaralha o array in-place (Fisher-Yates).
  //
  // @returns {Array}  o mesmo array embaralhado
  // ---------------------------------------------------
  function shuffle(array) {
    // TODO: implementar Fisher-Yates usando next()
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
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { seed, next, int, float, pick, shuffle, generateSeedString };

})();