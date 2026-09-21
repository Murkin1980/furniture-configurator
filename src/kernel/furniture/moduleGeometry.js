/**
 * Module geometry: turn a canonical FurnitureModule + its wall into world space.
 *
 * A FurnitureModule stores wall-relative coordinates only:
 *
 *   FurnitureModule { id, type, width, height, depth, wallId, wallOffset, parameters }
 *
 * No module ever stores world X/Y (CP-01 section 20: placement must not require
 * manually entered world XYZ for normal wall placement).
 */

import { wallPointAt } from '../geometry/wall.js';
import { add, scale, vec2 } from '../geometry/vec2.js';

/**
 * Resolve the derived wall record for a module.
 * @throws when the module references an unknown wall.
 */
export function moduleWall(room, module) {
  const wall = room.wall(module.wallId);
  if (!wall) {
    throw new Error(`module "${module.id}" references unknown wall "${module.wallId}"`);
  }
  return wall;
}

/**
 * World transform of a module.
 *
 * `origin` is the module's back-left-bottom corner in world space; the module's
 * local frame (see furniture/cabinet.js) maps onto world as:
 *
 *   world = origin + localX * wallDirection + localY * wall.inwardNormal + (0,0,localZ)
 *
 * @returns {{origin:{x,y}, angleRad:number, width:number, depth:number, height:number, wallId:string}}
 */
export function moduleTransform(room, module) {
  const wall = moduleWall(room, module);
  const backLeft = wallPointAt(wall, module.wallOffset ?? 0);
  return {
    wallId: wall.id,
    origin: backLeft,
    direction: wall.direction,
    inwardNormal: wall.inwardNormal,
    angleRad: wall.angleRad,
    width: module.width,
    depth: module.depth,
    height: module.height,
  };
}

/**
 * Map a module-local point into world plan coordinates.
 */
export function localToWorld(transform, localX, localY) {
  const along = scale(transform.direction, localX);
  const inward = scale(transform.inwardNormal, localY);
  return vec2(transform.origin.x + along.x + inward.x, transform.origin.y + along.y + inward.y);
}

/**
 * Plan footprint of a module (4 world points, CCW when viewed from +Z
 * for a CCW room). Used for collision detection and for the plan view.
 */
export function moduleFootprint(room, module) {
  const tr = moduleTransform(room, module);
  return [
    localToWorld(tr, 0, 0),
    localToWorld(tr, tr.width, 0),
    localToWorld(tr, tr.width, tr.depth),
    localToWorld(tr, 0, tr.depth),
  ];
}

/**
 * The "cabinet strip" of a wall: the plan region that cabinets standing on
 * this wall can occupy, at a given depth. Used for corner reservation maths.
 */
export function wallStrip(room, wallId, depth) {
  const wall = room.wall(wallId);
  if (!wall) throw new Error(`wallStrip: unknown wall "${wallId}"`);
  const a = wallPointAt(wall, 0);
  const b = wallPointAt(wall, wall.length);
  const inward = scale(wall.inwardNormal, depth);
  return [a, b, add(b, inward), add(a, inward)];
}
