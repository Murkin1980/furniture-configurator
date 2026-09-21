/**
 * Pointer drop -> placement action (CP-07).
 *
 * Turns a drag-and-drop gesture on the plan view into a canonical action for
 * applyAction(). The geometry helpers are pure and derived: nearestWall()
 * projects a world point onto the closest wall segment; dropAction() converts
 * the drop point into { type:'move', wallId, index } using the *derived*
 * wallOffsets of the current run, so the UI still owns no placement logic.
 */

import { buildProject } from './project.js';

/**
 * @param {object} room built room (bundle.room)
 * @param {{x:number,y:number}} point world plan point
 * @returns {{wallId:string, offset:number, dist:number}}
 */
export function nearestWall(room, point) {
  let best = null;
  for (const w of room.walls) {
    const dx = point.x - w.start.x;
    const dy = point.y - w.start.y;
    const t = Math.max(0, Math.min(w.length, dx * w.direction.x + dy * w.direction.y));
    const px = w.start.x + w.direction.x * t;
    const py = w.start.y + w.direction.y * t;
    const dist = Math.hypot(point.x - px, point.y - py);
    if (!best || dist < best.dist) best = { wallId: w.id, offset: t, dist };
  }
  return best;
}

/**
 * The move action a drop at `point` represents for `moduleId`.
 * The target index counts run-mates (excluding the dragged module) whose
 * derived wallOffset lies before the drop offset - i.e. insertion position.
 *
 * @param {object} definition canonical project definition
 * @param {string} moduleId
 * @param {{x:number,y:number}} point world plan point
 * @returns {{type:'move', moduleId:string, wallId:string, index:number}}
 */
export function dropAction(definition, moduleId, point) {
  if (!definition.modules.some((m) => m.id === moduleId)) {
    throw new Error(`dropAction: no module "${moduleId}"`);
  }
  const bundle = buildProject(definition);
  const hit = nearestWall(bundle.room, point);
  const index = bundle.modules.filter(
    (m) => m.wallId === hit.wallId && m.id !== moduleId && m.wallOffset < hit.offset,
  ).length;
  return { type: 'move', moduleId, wallId: hit.wallId, index };
}
