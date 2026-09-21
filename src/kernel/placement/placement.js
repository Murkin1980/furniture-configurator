/**
 * Placement engine (CP-01 section 10).
 *
 * Scope, deliberately minimal and deterministic:
 *   - wall vector / length / angle            (geometry/wall.js)
 *   - wallOffset -> world coordinates          (geometry/wall.js + moduleGeometry.js)
 *   - orient a module to its wall              (moduleGeometry.js)
 *   - module overlap detection                 (findOverlaps, convex SAT)
 *   - connected-wall corner                    (room.js, line intersection)
 *   - corner reservation / occupancy           (computeReservations, cornerOccupancy)
 *   - two perpendicular walls                  (fixture kitchen-2500x1500)
 *
 * No generalised optimiser, no AI, no physics (CP-01 sections 10 and 16).
 */

import {
  clipConvex,
  convexPolygonsOverlap,
  mergeIntervals,
  polygonOrientation,
  polygonSignedArea,
} from '../geometry/intersect.js';
import { add, scale, sub } from '../geometry/vec2.js';
import { moduleFootprint, moduleTransform, wallStrip } from '../furniture/moduleGeometry.js';

/** Largest module depth in the project; used as the reservation strip depth. */
export function maxModuleDepth(modules) {
  return modules.reduce((max, m) => Math.max(max, m.depth), 0);
}

/**
 * Intervals of `wallId` (measured from that wall's start) that are blocked by
 * modules standing on OTHER walls.
 *
 * Computed geometrically: each foreign module's footprint is clipped against
 * this wall's cabinet strip, and the surviving polygon is projected onto the
 * wall axis. Nothing here is hand-authored.
 */
export function blockedIntervalsOnWall(room, modules, wallId) {
  const wall = room.wall(wallId);
  if (!wall) throw new Error(`blockedIntervalsOnWall: unknown wall "${wallId}"`);
  const depth = maxModuleDepth(modules);
  if (depth <= 0) return [];
  const strip = wallStrip(room, wallId, depth);

  const raw = [];
  for (const m of modules) {
    if (m.wallId === wallId) continue;
    const clipped = clipConvex(moduleFootprint(room, m), strip);
    if (clipped.length < 3) continue;
    // A flush neighbour clips to a zero-area sliver. That is contact, not a
    // reservation, so it must not block anything.
    if (Math.abs(polygonSignedArea(clipped)) < 1e-6) continue;
    const local = clipped.map((p) => {
      const rel = sub(p, wall.start);
      return rel.x * wall.direction.x + rel.y * wall.direction.y;
    });
    raw.push({ from: Math.min(...local), to: Math.max(...local) });
  }
  return mergeIntervals(raw);
}

/**
 * Reserved (unusable) length at the START and END of each wall, caused by
 * modules on neighbouring walls. This is what makes an L-corner work: the
 * second run must stand off by the depth of the cabinet that owns the corner.
 */
export function computeReservations(room, modules) {
  const out = new Map();
  for (const wall of room.walls) {
    const blocked = blockedIntervalsOnWall(room, modules, wall.id);
    let atStart = 0;
    let atEnd = 0;
    for (const iv of blocked) {
      if (iv.from <= 1e-6) atStart = Math.max(atStart, iv.to);
      if (iv.to >= wall.length - 1e-6) atEnd = Math.max(atEnd, wall.length - iv.from);
    }
    out.set(wall.id, { wallId: wall.id, atStart, atEnd, blocked });
  }
  return out;
}

/**
 * Which module owns a corner.
 *
 * The corner itself is computed by room.js; here we probe a point a little way
 * along the corner's interior bisector and find the module whose footprint
 * contains it. Returns null when the corner is free.
 */
export function cornerOccupancy(room, modules, corner, probeDistance = 50) {
  const probe = add(corner.point, scale(corner.bisector, probeDistance));
  for (const m of modules) {
    const poly = moduleFootprint(room, m);
    if (pointInConvex(poly, probe)) {
      return { moduleId: m.id, wallId: m.wallId, depth: m.depth, point: probe };
    }
  }
  return null;
}

/** Point-in-convex-polygon test (winding-consistent). */
export function pointInConvex(poly, p) {
  const orientation = polygonOrientation(poly);
  if (orientation === 'degenerate') return false;
  const sign = orientation === 'ccw' ? 1 : -1;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross * sign < -1e-6) return false;
  }
  return true;
}

/**
 * Sequential run packing.
 *
 * Modules that set `autoOffset: true` are laid end to end along their wall,
 * starting after the corner reservation. Modules with an explicit `wallOffset`
 * are respected as authored. Order within a wall is the array order.
 *
 * @returns {object[]} new module objects with resolved wallOffset
 */
export function packRuns(room, modules, reservations) {
  const byWall = new Map();
  modules.forEach((m, index) => {
    const list = byWall.get(m.wallId) ?? [];
    list.push({ m, index });
    byWall.set(m.wallId, list);
  });

  const resolved = modules.map((m) => ({ ...m }));
  for (const [wallId, entries] of byWall) {
    const wall = room.wall(wallId);
    if (!wall) throw new Error(`packRuns: unknown wall "${wallId}"`);
    const res = reservations.get(wallId) ?? { atStart: 0 };
    let cursor = Math.max(0, res.atStart);
    for (const { m, index } of entries) {
      if (m.autoOffset) {
        resolved[index].wallOffset = cursor;
        cursor += m.width;
      } else {
        const offset = m.wallOffset ?? 0;
        resolved[index].wallOffset = offset;
        cursor = Math.max(cursor, offset + m.width);
      }
    }
  }
  return resolved;
}

/**
 * Resolve every module's wallOffset, iterating the
 * (packing -> reservation -> packing) loop to a fixed point.
 *
 * The loop is needed because wall B's stand-off depends on what wall A's
 * modules ended up doing, and vice versa. It is bounded and deterministic.
 */
export function layoutModules(room, modules, { maxIterations = 10 } = {}) {
  let current = modules.map((m) => ({ ...m }));
  for (let i = 0; i < maxIterations; i += 1) {
    const reservations = computeReservations(room, current);
    const next = packRuns(room, current, reservations);
    const stable = next.every(
      (m, idx) => Math.abs(m.wallOffset - current[idx].wallOffset) < 1e-9,
    );
    current = next;
    if (stable) return current;
  }
  throw new Error('layoutModules: placement did not converge (cyclic corner dependency?)');
}

/**
 * All pairs of modules whose footprints overlap.
 * Flush (touching) neighbours are not overlaps.
 */
export function findOverlaps(room, modules, tol = 1e-6) {
  const polys = modules.map((m) => moduleFootprint(room, m));
  const hits = [];
  for (let i = 0; i < modules.length; i += 1) {
    for (let j = i + 1; j < modules.length; j += 1) {
      if (convexPolygonsOverlap(polys[i], polys[j], tol)) {
        hits.push({ a: modules[i].id, b: modules[j].id });
      }
    }
  }
  return hits;
}

/**
 * Occupied and free intervals along a wall, in wall coordinates.
 * Mirrors the "is there a gap in this run" question without any UI.
 */
export function wallOccupancy(room, modules, wallId) {
  const wall = room.wall(wallId);
  if (!wall) throw new Error(`wallOccupancy: unknown wall "${wallId}"`);
  const occupied = mergeIntervals(
    modules
      .filter((m) => m.wallId === wallId)
      .map((m) => ({ from: m.wallOffset ?? 0, to: (m.wallOffset ?? 0) + m.width })),
  );
  const free = [];
  let cursor = 0;
  for (const iv of occupied) {
    if (iv.from > cursor + 1e-6) free.push({ from: cursor, to: iv.from });
    cursor = Math.max(cursor, iv.to);
  }
  if (cursor < wall.length - 1e-6) free.push({ from: cursor, to: wall.length });
  return { wallId, length: wall.length, occupied, free };
}

/**
 * Does the module fit inside its wall's usable length?
 */
export function moduleWithinWall(room, module, tol = 1e-6) {
  const wall = room.wall(module.wallId);
  if (!wall) throw new Error(`moduleWithinWall: unknown wall "${module.wallId}"`);
  const from = module.wallOffset ?? 0;
  return from >= -tol && from + module.width <= wall.length + tol;
}

/** Convenience: world position of a module's footprint centre. */
export function moduleCentre(room, module) {
  const tr = moduleTransform(room, module);
  const along = scale(tr.direction, tr.width / 2);
  const inward = scale(tr.inwardNormal, tr.depth / 2);
  return add(add(tr.origin, along), inward);
}
