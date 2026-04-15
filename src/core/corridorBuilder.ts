import type { Corridor, Point, Room } from '../types.ts';
import { MathUtils } from '../utils/math.ts';
import { Random } from '../utils/random.ts';

export const CorridorBuilder = (() => {
  const CORRIDOR_WIDTH = 16;
  const HALF_W = CORRIDOR_WIDTH / 2;

  function build(rooms: Room[]): Corridor[] {
    if (rooms.length < 2) return [];

    const allEdges = _buildGraph(rooms);
    const mstEdges = _minimumSpanningTree(allEdges, rooms);
    const finalEdges = _addExtraEdges(mstEdges, allEdges);

    const usedSides: Record<number, Set<string>> = {};
    rooms.forEach((r) => {
      usedSides[r.id] = new Set();
    });

    return finalEdges.map((edge) => {
      const roomA = rooms.find((r) => r.id === edge.fromId) as Room;
      const roomB = rooms.find((r) => r.id === edge.toId) as Room;

      if (!roomA.connections.includes(roomB.id)) roomA.connections.push(roomB.id);
      if (!roomB.connections.includes(roomA.id)) roomB.connections.push(roomA.id);

      return _buildCorridor(roomA, roomB, usedSides, rooms);
    });
  }

  function _buildGraph(rooms: Room[]) {
    const edges: Array<{ fromId: number; toId: number; distance: number }> = [];
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        edges.push({
          fromId: rooms[i].id,
          toId: rooms[j].id,
          distance: MathUtils.distance(MathUtils.rectCenter(rooms[i]), MathUtils.rectCenter(rooms[j])),
        });
      }
    }
    edges.sort((a, b) => a.distance - b.distance);
    return edges;
  }

  function _minimumSpanningTree(
    edges: Array<{ fromId: number; toId: number; distance: number }>,
    rooms: Room[],
  ) {
    const parent: Record<number, number> = {};
    rooms.forEach((r) => {
      parent[r.id] = r.id;
    });

    function find(id: number): number {
      if (parent[id] !== id) parent[id] = find(parent[id]);
      return parent[id];
    }

    function union(a: number, b: number) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent[ra] = rb;
      return true;
    }

    const mst: Array<{ fromId: number; toId: number; distance: number }> = [];
    edges.forEach((e) => {
      if (union(e.fromId, e.toId)) mst.push(e);
    });
    return mst;
  }

  function _addExtraEdges(
    mstEdges: Array<{ fromId: number; toId: number; distance: number }>,
    allEdges: Array<{ fromId: number; toId: number; distance: number }>,
  ) {
    const mstSet = new Set(mstEdges.map((e) => `${Math.min(e.fromId, e.toId)}-${Math.max(e.fromId, e.toId)}`));
    const extras = allEdges
      .filter((e) => !mstSet.has(`${Math.min(e.fromId, e.toId)}-${Math.max(e.fromId, e.toId)}`))
      .filter(() => Random.next() < 0.15);

    return [...mstEdges, ...extras.map((e) => ({ fromId: e.fromId, toId: e.toId }))];
  }

  function _chooseSide(room: Room, targetCenter: Point, usedSides: Record<number, Set<string>>) {
    const center = MathUtils.rectCenter(room);
    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;

    const preferred =
      Math.abs(dx) >= Math.abs(dy)
        ? dx >= 0
          ? ['right', 'top', 'bottom', 'left']
          : ['left', 'top', 'bottom', 'right']
        : dy >= 0
          ? ['bottom', 'right', 'left', 'top']
          : ['top', 'right', 'left', 'bottom'];

    const chosen = preferred.find((s) => !usedSides[room.id].has(s)) || preferred[0];
    usedSides[room.id].add(chosen);
    return chosen;
  }

  function _getExitPoint(room: Room, side: string) {
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;
    switch (side) {
      case 'right':
        return { x: room.x + room.width, y: cy, axis: 'h' as const };
      case 'left':
        return { x: room.x, y: cy, axis: 'h' as const };
      case 'bottom':
        return { x: cx, y: room.y + room.height, axis: 'v' as const };
      default:
        return { x: cx, y: room.y, axis: 'v' as const };
    }
  }

  function _segmentCrossesRoom(p1: Point, p2: Point, room: Room) {
    const rx1 = room.x - HALF_W;
    const ry1 = room.y - HALF_W;
    const rx2 = room.x + room.width + HALF_W;
    const ry2 = room.y + room.height + HALF_W;

    if (p1.y === p2.y) {
      const y = p1.y;
      const x1 = Math.min(p1.x, p2.x);
      const x2 = Math.max(p1.x, p2.x);
      return y > ry1 && y < ry2 && x2 > rx1 && x1 < rx2;
    }

    const x = p1.x;
    const y1 = Math.min(p1.y, p2.y);
    const y2 = Math.max(p1.y, p2.y);
    return x > rx1 && x < rx2 && y2 > ry1 && y1 < ry2;
  }

  function _pathIsBlocked(points: Point[], rooms: Room[]) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (p1.x === p2.x && p1.y === p2.y) continue;
      for (const room of rooms) {
        if (_segmentCrossesRoom(p1, p2, room)) return true;
      }
    }
    return false;
  }

  function _buildCorridor(
    roomA: Room,
    roomB: Room,
    usedSides: Record<number, Set<string>>,
    allRooms: Room[],
  ): Corridor {
    const centerA = MathUtils.rectCenter(roomA);
    const centerB = MathUtils.rectCenter(roomB);

    const sideA = _chooseSide(roomA, centerB, usedSides);
    const sideB = _chooseSide(roomB, centerA, usedSides);

    const exitA = _getExitPoint(roomA, sideA);
    const exitB = _getExitPoint(roomB, sideB);

    const others = allRooms.filter((r) => r.id !== roomA.id && r.id !== roomB.id);
    const candidates: Point[][] = [];

    if (exitA.axis === exitB.axis) {
      if (exitA.axis === 'h') {
        const midCenter = (exitA.x + exitB.x) / 2;
        const left = Math.min(exitA.x, exitB.x) - 80;
        const right = Math.max(exitA.x, exitB.x) + 80;

        [midCenter, exitA.x + (exitB.x - exitA.x) * 0.25, exitA.x + (exitB.x - exitA.x) * 0.75, left, right].forEach(
          (midX) => {
            candidates.push([
              { x: exitA.x, y: exitA.y },
              { x: midX, y: exitA.y },
              { x: midX, y: exitB.y },
              { x: exitB.x, y: exitB.y },
            ]);
          },
        );
      } else {
        const midCenter = (exitA.y + exitB.y) / 2;
        const top = Math.min(exitA.y, exitB.y) - 80;
        const bottom = Math.max(exitA.y, exitB.y) + 80;

        [midCenter, exitA.y + (exitB.y - exitA.y) * 0.25, exitA.y + (exitB.y - exitA.y) * 0.75, top, bottom].forEach(
          (midY) => {
            candidates.push([
              { x: exitA.x, y: exitA.y },
              { x: exitA.x, y: midY },
              { x: exitB.x, y: midY },
              { x: exitB.x, y: exitB.y },
            ]);
          },
        );
      }
    } else if (exitA.axis === 'h') {
      candidates.push([
        { x: exitA.x, y: exitA.y },
        { x: exitB.x, y: exitA.y },
        { x: exitB.x, y: exitB.y },
      ]);
      const midX = (exitA.x + exitB.x) / 2;
      candidates.push([
        { x: exitA.x, y: exitA.y },
        { x: midX, y: exitA.y },
        { x: midX, y: exitB.y },
        { x: exitB.x, y: exitB.y },
      ]);
    } else {
      candidates.push([
        { x: exitA.x, y: exitA.y },
        { x: exitA.x, y: exitB.y },
        { x: exitB.x, y: exitB.y },
      ]);
      const midY = (exitA.y + exitB.y) / 2;
      candidates.push([
        { x: exitA.x, y: exitA.y },
        { x: exitA.x, y: midY },
        { x: exitB.x, y: midY },
        { x: exitB.x, y: exitB.y },
      ]);
    }

    let chosen = candidates[0];
    for (const pts of candidates) {
      if (!_pathIsBlocked(pts, others)) {
        chosen = pts;
        break;
      }
    }

    return {
      fromRoomId: roomA.id,
      toRoomId: roomB.id,
      points: chosen,
      width: CORRIDOR_WIDTH,
    };
  }

  return { build };
})();
