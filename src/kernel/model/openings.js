/**
 * Opening edits (CP-10) - pure canonical-model rewrites.
 *
 * Doors/windows stay wall-relative (kind, wallId, offset, width, sill/head);
 * these helpers only rewrite those fields with clamping to the wall, so the
 * placement kernel keeps routing around them automatically (OPENING_BLOCKED /
 * blocked-interval packing). The UI drags openings; the journal records the
 * same actions as every other edit.
 */

const MIN_WIDTH = 100;

function getWall(definition, wallId) {
  const wall = definition.room.walls.find((w) => w.id === wallId);
  if (!wall) throw new Error(`openings: unknown wall "${wallId}"`);
  return wall;
}

// Raw definition walls store endpoints only; length is derived here (the
// kernel derives the same number in buildRoom).
const wallLen = (w) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);

function getOpening(definition, openingId) {
  const o = (definition.room.openings ?? []).find((x) => x.id === openingId);
  if (!o) throw new Error(`openings: no opening "${openingId}"`);
  return o;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Slide an opening along its own wall (offset clamped to the wall). */
export function moveOpening(definition, openingId, offset) {
  const o = getOpening(definition, openingId);
  const wall = getWall(definition, o.wallId);
  const at = clamp(offset, 0, Math.max(0, wallLen(wall) - o.width));
  return {
    ...definition,
    room: {
      ...definition.room,
      openings: definition.room.openings.map((x) =>
        x.id === openingId ? { ...x, offset: at } : x,
      ),
    },
  };
}

/** Resize an opening width; keeps it inside the wall. */
export function resizeOpening(definition, openingId, width) {
  const o = getOpening(definition, openingId);
  const wall = getWall(definition, o.wallId);
  const w = clamp(width, MIN_WIDTH, wallLen(wall));
  const at = clamp(o.offset, 0, Math.max(0, wallLen(wall) - w));
  return {
    ...definition,
    room: {
      ...definition.room,
      openings: definition.room.openings.map((x) =>
        x.id === openingId ? { ...x, width: w, offset: at } : x,
      ),
    },
  };
}

/** Next collision-free opening id (d1, d2, ...) when the action has none. */
export function nextOpeningId(definition) {
  let n = 1;
  const ids = new Set((definition.room.openings ?? []).map((o) => o.id));
  while (ids.has(`d${n}`)) n += 1;
  return `d${n}`;
}

/** Add a wall-relative opening (defaults: door 800x2050 at 0). */
export function addOpening(definition, opening) {
  const wallId = opening?.wallId;
  getWall(definition, wallId); // throws on unknown wall
  const id = opening.id ?? nextOpeningId(definition);
  const wall = getWall(definition, wallId);
  const width = clamp(opening.width ?? 800, MIN_WIDTH, wallLen(wall));
  const o = {
    id,
    kind: opening.kind ?? 'door',
    wallId,
    offset: clamp(opening.offset ?? 0, 0, Math.max(0, wallLen(wall) - width)),
    width,
    sillHeight: opening.sillHeight ?? 0,
    headHeight: opening.headHeight ?? 2050,
  };
  return {
    ...definition,
    room: { ...definition.room, openings: [...(definition.room.openings ?? []), o] },
  };
}

export function removeOpening(definition, openingId) {
  getOpening(definition, openingId); // throws on unknown
  return {
    ...definition,
    room: {
      ...definition.room,
      openings: definition.room.openings.filter((x) => x.id !== openingId),
    },
  };
}
