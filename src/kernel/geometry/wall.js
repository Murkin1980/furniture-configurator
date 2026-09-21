/**
 * Wall geometry.
 *
 * A wall is stored canonically as two endpoints only:
 *
 *   Wall { id, start:{x,y}, end:{x,y} }
 *
 * Direction, length, angle and normals are DERIVED here. Nothing downstream is
 * allowed to store a duplicated length or angle (CP-01 critical invariant:
 * one canonical model, derived everything).
 */

import {
  EPS,
  angleOf,
  dist,
  normalize,
  perpLeft,
  sub,
  toDeg,
  vec2,
} from './vec2.js';

/** Unit direction vector start -> end. */
export function wallDirection(wall) {
  return normalize(sub(wall.end, wall.start));
}

/** Raw direction vector start -> end (not normalised). */
export const wallVector = (wall) => sub(wall.end, wall.start);

/** Wall length in mm. */
export function wallLength(wall) {
  return dist(wall.start, wall.end);
}

/** Wall angle from +X axis, radians, in (-PI, PI]. */
export function wallAngleRad(wall) {
  return angleOf(wallVector(wall));
}

/** Wall angle from +X axis, degrees, in (-180, 180]. */
export function wallAngleDeg(wall) {
  return toDeg(wallAngleRad(wall));
}

/**
 * Left perpendicular of the wall direction (90 deg counter-clockwise).
 * For a counter-clockwise room polygon this points INTO the room.
 */
export function wallLeftNormal(wall) {
  return perpLeft(wallDirection(wall));
}

/**
 * Point on the wall axis at distance `offset` from `wall.start`.
 *
 * This is the single source of truth for the `wallOffset -> world` mapping.
 * Offsets are measured along the wall, never as world X/Y.
 */
export function wallPointAt(wall, offset) {
  const d = wallDirection(wall);
  return vec2(wall.start.x + d.x * offset, wall.start.y + d.y * offset);
}

/**
 * Project a world point onto the wall axis.
 * @returns {{offset:number, lateral:number}} offset along the wall from start,
 *   lateral distance along the left normal (positive = left of the wall).
 */
export function worldToWallOffset(wall, point) {
  const d = wallDirection(wall);
  const n = perpLeft(d);
  const rel = sub(point, wall.start);
  return { offset: rel.x * d.x + rel.y * d.y, lateral: rel.x * n.x + rel.y * n.y };
}

/**
 * Signed turn angle at the joint from `prev` into `next`, degrees.
 * 90 => left turn (interior corner of a CCW room), -90 => right turn.
 */
export function turnAngleDeg(prev, next) {
  const a = wallAngleRad(prev);
  const b = wallAngleRad(next);
  let delta = toDeg(b - a) % 360;
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
}

/** True when two walls are parallel within tolerance. */
export function wallsParallel(a, b, tol = 1e-9) {
  const va = wallVector(a);
  const vb = wallVector(b);
  return Math.abs(va.x * vb.y - va.y * vb.x) <= tol * Math.max(1, dist(a.start, a.end) * dist(b.start, b.end));
}

/** True when the wall is degenerate (zero length). */
export const wallIsDegenerate = (wall) => wallLength(wall) < EPS;
