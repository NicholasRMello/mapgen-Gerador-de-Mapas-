/**
 * math.js — Math utilities for map geometry
 *
 * Pure functions (stateless) used by various modules.
 */

const MathUtils = (() => {

  // ---------------------------------------------------
  // distance(a, b)
  // Euclidean distance between two points.
  //
  // @param {{ x, y }} a
  // @param {{ x, y }} b
  // @returns {number}
  // ---------------------------------------------------
  function distance(a, b) {
    // TODO: Math.sqrt((b.x - a.x)^2 + (b.y - a.y)^2)

    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  // ---------------------------------------------------
  // rectCenter(rect)
  // Returns the center of a rectangle.
  //
  // @param {{ x, y, width, height }} rect
  // @returns {{ x, y }}
  // ---------------------------------------------------
  function rectCenter(rect) {
    // TODO: return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 }

    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  // ---------------------------------------------------
  // rectsOverlap(a, b, padding)
  // Checks if two rectangles overlap with extra margin.
  //
  // @param {{ x, y, width, height }} a
  // @param {{ x, y, width, height }} b
  // @param {number} padding  additional spacing margin
  // @returns {boolean}
  // ---------------------------------------------------
  function rectsOverlap(a, b, padding = 0) {
    // TODO: compare edges considering padding
    //   a.x + a.width  + padding > b.x  && etc.

    return (a.x + a.width + padding > b.x &&
            a.x < b.x + b.width + padding &&
            a.y + a.height + padding > b.y &&
            a.y < b.y + b.height + padding);
  }

  // ---------------------------------------------------
  // clamp(value, min, max)
  // Clamps value within the range [min, max].
  //
  // @returns {number}
  // ---------------------------------------------------
  function clamp(value, min, max) {
    // TODO: Math.min(Math.max(value, min), max)
    return Math.min(Math.max(value, min), max);

  }

  // ---------------------------------------------------
  // lerp(a, b, t)
  // Linear interpolation between a and b.
  //
  // @param {number} t  progress from 0 to 1
  // @returns {number}
  // ---------------------------------------------------
  function lerp(a, b, t) {
    // TODO: a + (b - a) * t
    return a + (b - a) * t;
  }

  // ---------------------------------------------------
  // pointInRect(point, rect)
  // Checks if a point is inside a rectangle.
  // Useful for detecting a click on a room.
  //
  // @param {{ x, y }} point
  // @param {{ x, y, width, height }} rect
  // @returns {boolean}
  // ---------------------------------------------------
  function pointInRect(point, rect) {
    // TODO: check if point.x and point.y are inside rect
    return (point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height);
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { distance, rectCenter, rectsOverlap, clamp, lerp, pointInRect };

})();
