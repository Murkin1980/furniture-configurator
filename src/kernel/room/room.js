/**
 * Room model.
 *
 * Canonical input (the only stored room geometry):
 *
 *   Room {
 *     id,
 *     height,                       // ceiling height, mm
 *     walls: [ { id, start:{x,y}, end:{x,y}, thickness } ]   // closed loop, in order
 *   }
 *
 * Derived output (never stored by callers):
 *   - per wall: direction, length, angleDeg, inwardNormal
 *   - per corner: the COMPUTED intersection of two wall axis lines,
 *     plus the interior bisector used for corner occupancy probes
 *
 * CP-01 section 13 (90 deg corner gate): the corner point is produced by
 * lineIntersection() on the two wall axes. It is never typed in by hand.
 */

import { lineIntersection, polygonOrientation } from '../geometry/intersect.js';
import {
  wallAngleDeg,
  wallAngleRad,
  wallDirection,
  wallLength,
  wallPointAt,
  turnAngleDeg,
} from '../geometry/wall.js';
import { add, normalize, scale, vec2 } from '../geometry/vec2.js';

/**
 * @param {object} roomDef canonical room definition (see module docs)
 * @returns {object} derived room: { walls, corners, orientation, area, height }
 */
export function buildRoom(roomDef) {
  if (!roomDef || !Array.isArray(roomDef.walls) || roomDef.walls.length < 3) {
    throw new Error('buildRoom: a room needs at least 3 walls forming a closed loop');
  }

  const orientation = polygonOrientation(roomDef.walls.map((w) => w.start));
  if (orientation === 'degenerate') {
    throw new Error('buildRoom: room polygon has zero area');
  }
  // Interior of a CCW polygon is to the LEFT of each directed edge.
  const inwardSign = orientation === 'ccw' ? 1 : -1;

  const walls = roomDef.walls.map((w, i) => {
    const length = wallLength(w);
    if (length <= 0) throw new Error(`buildRoom: wall "${w.id}" has zero length`);
    const dir = wallDirection(w);
    const left = { x: -dir.y, y: dir.x };
    return {
      id: w.id,
      index: i,
      start: { ...w.start },
      end: { ...w.end },
      thickness: w.thickness ?? 0,
      direction: dir,
      length,
      angleRad: wallAngleRad(w),
      angleDeg: wallAngleDeg(w),
      inwardNormal: { x: left.x * inwardSign, y: left.y * inwardSign },
    };
  });

  const corners = walls.map((wall, i) => {
    const next = walls[(i + 1) % walls.length];
    const hit = lineIntersection(wall.start, wall.end, next.start, next.end);
    if (!hit) {
      throw new Error(
        `buildRoom: walls "${wall.id}" and "${next.id}" are parallel - no corner exists`,
      );
    }
    const point = vec2(hit.x, hit.y);
    // Interior bisector: sum of the two walls' inward normals.
    const bisectorRaw = add(wall.inwardNormal, next.inwardNormal);
    const bisector =
      Math.hypot(bisectorRaw.x, bisectorRaw.y) > 1e-9
        ? normalize(bisectorRaw)
        : scale(wall.inwardNormal, -1);
    return {
      id: `${wall.id}__${next.id}`,
      wallBefore: wall.id,
      wallAfter: next.id,
      /** Corner point on the wall axis lines - computed, not authored. */
      point,
      /**
       * Signed distance from `wall.end` to the corner, along the wall.
       * 0 => the walls share an endpoint. Negative => the wall overshoots
       * past the corner. Positive => the wall stops short of it.
       */
      endGap: (hit.t - 1) * wall.length,
      /** Signed distance from `next.start` to the corner, along `next`. */
      startGap: hit.u * next.length,
      turnDeg: turnAngleDeg(wall, next),
      bisector,
    };
  });

  const byId = new Map(walls.map((w) => [w.id, w]));

  /**
   * Openings (doors, windows) belong to a wall and are stored as a
   * wall-relative offset + width, never as world coordinates. Their world
   * segment is derived here.
   */
  const openings = (roomDef.openings ?? []).map((o) => {
    const wall = byId.get(o.wallId);
    if (!wall) throw new Error(`buildRoom: opening "${o.id}" references unknown wall "${o.wallId}"`);
    if (!(o.width > 0)) throw new Error(`buildRoom: opening "${o.id}" has non-positive width`);
    return {
      id: o.id,
      kind: o.kind ?? 'window',
      wallId: o.wallId,
      offset: o.offset,
      width: o.width,
      sillHeight: o.sillHeight ?? 0,
      headHeight: o.headHeight ?? 2000,
      start: wallPointAt(wall, o.offset),
      end: wallPointAt(wall, o.offset + o.width),
    };
  });

  return {
    id: roomDef.id ?? 'room',
    height: roomDef.height ?? 2500,
    orientation,
    walls,
    corners,
    openings,
    byId,
    openingsOn: (wallId) => openings.filter((o) => o.wallId === wallId),
    /** Corner leaving `wallId` (i.e. at the wall's END). */
    cornerAtEndOf: (wallId) => corners.find((c) => c.wallBefore === wallId) ?? null,
    /** Corner entering `wallId` (i.e. at the wall's START). */
    cornerAtStartOf: (wallId) => corners.find((c) => c.wallAfter === wallId) ?? null,
    wall: (wallId) => byId.get(wallId) ?? null,
    pointAt: (wallId, offset) => wallPointAt(byId.get(wallId), offset),
  };
}
