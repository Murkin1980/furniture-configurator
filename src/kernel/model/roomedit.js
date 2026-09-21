/**
 * Room-shape editing (CP-08) - pure canonical-model rewrites.
 *
 * moveCorner() drags the shared endpoint of two consecutive walls. Without
 * snapping the corner follows the pointer; with `snap90` (Shift in the UI,
 * mirroring GrabSketch's room editor) the pointer is projected onto the circle
 * having the two fixed neighbours' endpoints as diameter, which makes the two
 * walls meet at exactly 90 degrees. Everything downstream (corners, turn
 * angles, reservations, placement) is then re-derived by buildRoom/buildProject
 * - the editor stores no geometry of its own.
 */

/**
 * @param {object} definition canonical project definition
 * @param {number} cornerIndex index of the corner (junction after walls[i])
 * @param {{x:number,y:number}} point world target
 * @param {{snap90?:boolean}} [opts]
 * @returns {object} next canonical definition
 */
export function moveCorner(definition, cornerIndex, point, opts = {}) {
  const walls = definition.room.walls;
  const n = walls.length;
  if (!Number.isInteger(cornerIndex) || cornerIndex < 0 || cornerIndex >= n) {
    throw new Error(`moveCorner: corner index ${cornerIndex} out of range (0..${n - 1})`);
  }
  const i = cornerIndex;
  const j = (i + 1) % n;
  const S = walls[i].start; // fixed end of the incoming wall
  const E = walls[j].end;   // fixed end of the outgoing wall

  let c = { x: point.x, y: point.y };
  if (opts.snap90) {
    // C on the Thales circle over SE => (C-S) . (E-C) = 0 => right angle at C.
    const mid = { x: (S.x + E.x) / 2, y: (S.y + E.y) / 2 };
    const R = Math.hypot(E.x - S.x, E.y - S.y) / 2;
    if (R < 1e-9) throw new Error('moveCorner: adjacent fixed endpoints coincide');
    const d = Math.hypot(point.x - mid.x, point.y - mid.y) || 1;
    c = {
      x: mid.x + ((point.x - mid.x) / d) * R,
      y: mid.y + ((point.y - mid.y) / d) * R,
    };
  }

  const nextWalls = walls.map((w, k) => {
    if (k === i) return { ...w, end: { ...c } };
    if (k === j) return { ...w, start: { ...c } };
    return w;
  });
  return { ...definition, room: { ...definition.room, walls: nextWalls } };
}
