/**
 * math.js — Utilitários matemáticos para geometria do mapa
 *
 * Funções puras (sem estado) usadas por vários módulos.
 */

const MathUtils = (() => {

  // ---------------------------------------------------
  // distance(a, b)
  // Distância euclidiana entre dois pontos.
  //
  // @param {{ x, y }} a
  // @param {{ x, y }} b
  // @returns {number}
  // ---------------------------------------------------
  function distance(a, b) {
    // TODO: Math.sqrt((b.x - a.x)² + (b.y - a.y)²)

    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  // ---------------------------------------------------
  // rectCenter(rect)
  // Retorna o centro de um retângulo.
  //
  // @param {{ x, y, width, height }} rect
  // @returns {{ x, y }}
  // ---------------------------------------------------
  function rectCenter(rect) {
    // TODO: retornar { x: rect.x + rect.width/2, y: rect.y + rect.height/2 }

    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  // ---------------------------------------------------
  // rectsOverlap(a, b, padding)
  // Verifica se dois retângulos se sobrepõem com margem extra.
  //
  // @param {{ x, y, width, height }} a
  // @param {{ x, y, width, height }} b
  // @param {number} padding  margem adicional de espaçamento
  // @returns {boolean}
  // ---------------------------------------------------
  function rectsOverlap(a, b, padding = 0) {
    // TODO: comparar bordas considerando padding
    //   a.x + a.width  + padding > b.x  && etc.

    return (a.x + a.width + padding > b.x &&
            a.x < b.x + b.width + padding &&
            a.y + a.height + padding > b.y &&
            a.y < b.y + b.height + padding);
  }

  // ---------------------------------------------------
  // clamp(value, min, max)
  // Limita value dentro do intervalo [min, max].
  //
  // @returns {number}
  // ---------------------------------------------------
  function clamp(value, min, max) {
    // TODO: Math.min(Math.max(value, min), max)
    return Math.min(Math.max(value, min), max);

  }

  // ---------------------------------------------------
  // lerp(a, b, t)
  // Interpolação linear entre a e b.
  //
  // @param {number} t  progresso de 0 a 1
  // @returns {number}
  // ---------------------------------------------------
  function lerp(a, b, t) {
    // TODO: a + (b - a) * t
    return a + (b - a) * t;
  }

  // ---------------------------------------------------
  // pointInRect(point, rect)
  // Verifica se um ponto está dentro de um retângulo.
  // Útil para detectar clique numa sala.
  //
  // @param {{ x, y }} point
  // @param {{ x, y, width, height }} rect
  // @returns {boolean}
  // ---------------------------------------------------
  function pointInRect(point, rect) {
    // TODO: checar se point.x e point.y estão dentro de rect
    return (point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height);
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { distance, rectCenter, rectsOverlap, clamp, lerp, pointInRect };

})();