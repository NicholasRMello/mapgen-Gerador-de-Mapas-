import type { Point, Room } from '../types.ts';

export const MathUtils = (() => {
  function distance(a: Point, b: Point) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  function rectCenter(rect: Pick<Room, 'x' | 'y' | 'width' | 'height'>): Point {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  function rectsOverlap(
    a: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
    b: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
    padding = 0,
  ) {
    return (
      a.x + a.width + padding > b.x &&
      a.x < b.x + b.width + padding &&
      a.y + a.height + padding > b.y &&
      a.y < b.y + b.height + padding
    );
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  function pointInRect(
    point: Point,
    rect: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
  ) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  return { distance, rectCenter, rectsOverlap, clamp, lerp, pointInRect };
})();
