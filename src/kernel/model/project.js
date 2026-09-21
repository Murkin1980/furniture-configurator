/**
 * Canonical project model + the single derivation entry point.
 *
 * CP-01 section 8 (critical invariant). The rendered scene is NOT the source of
 * truth. The flow is strictly one-way:
 *
 *     Canonical Project Model
 *             |
 *             v
 *     Parametric Furniture Kernel
 *             |
 *     +-------+--------+-----------+
 *     v                v           v
 *   View/3D         BOM/Parts   Validation
 *
 * `buildProject()` is the ONLY place that flow happens. Every consumer - the
 * SVG debug view, the BOM, the tests - calls it and reads its output. Nothing
 * downstream stores a dimension of its own, so one width change necessarily
 * propagates everywhere.
 */

import { buildRoom } from '../room/room.js';
import { normalizeProject, runsStartPoints } from './runs.js';
import {
  computeReservations,
  cornerOccupancy,
  layoutModules,
  wallOccupancy,
} from '../placement/placement.js';
import { bomTotals, cuttingGroups, deriveBom, deriveParts } from '../bom/bom.js';
import { validateProject } from '../validation/validate.js';

/**
 * Shape of the canonical model. Documentation as code - the runtime check
 * below enforces the required fields.
 *
 * Project {
 *   id, name, units:'mm',
 *   room: {
 *     id, height,
 *     walls: [ { id, start:{x,y}, end:{x,y}, thickness } ],   // closed loop, in order
 *     openings: [ { id, kind:'door'|'window', wallId, offset, width, sillHeight, headHeight } ]
 *   },
 *   modules: [ {
 *     id, type, width, height, depth,
 *     wallId, wallOffset?, autoOffset?, parameters?
 *   } ],
 *   sheet?: { sheetWidth, sheetHeight, kerf }
 * }
 */
export const CANONICAL_MODEL_SHAPE = Object.freeze({
  project: ['id', 'room', 'modules'],
  wall: ['id', 'start', 'end'],
  module: ['id', 'type', 'width', 'height', 'depth'],
});

/** Structural validation of a project definition (not geometry). */
export function assertProjectDefinition(def) {
  if (!def || typeof def !== 'object') throw new Error('project definition must be an object');
  for (const key of CANONICAL_MODEL_SHAPE.project) {
    if (def[key] === undefined) throw new Error(`project definition is missing "${key}"`);
  }
  if (!Array.isArray(def.modules)) throw new Error('project.modules must be an array');
  const ids = new Set();
  for (const m of def.modules) {
    for (const key of CANONICAL_MODEL_SHAPE.module) {
      if (m[key] === undefined) throw new Error(`module "${m.id ?? '?'}" is missing "${key}"`);
    }
    // wallId may live on the module (CP-01) or on a run (CP-02).
    if (!def.runs && m.wallId === undefined) {
      throw new Error(`module "${m.id}" is missing "wallId" (no runs declared)`);
    }
    if (ids.has(m.id)) throw new Error(`duplicate module id "${m.id}"`);
    ids.add(m.id);
  }
  return def;
}

/**
 * Derive everything from a canonical project definition.
 *
 * @param {object} definition canonical project (see CANONICAL_MODEL_SHAPE)
 * @returns {object} fully derived project bundle
 */
export function buildProject(definition) {
  const def = assertProjectDefinition(definition);

  // 0. Normalise to canonical runs (CP-01 module.wallId and CP-02 runs both work).
  const { runs, modules: ordered } = normalizeProject(def);

  // 1. Room geometry: walls, COMPUTED corners, inward normals, openings.
  const room = buildRoom(def.room);

  // 2. Placement: resolve wallOffsets (auto-packed runs honour corner
  //    reservations and openings; each run sets its wall's fill direction).
  const modules = layoutModules(room, ordered, { runs: runsStartPoints(runs) });

  // 3. Manufacturing: parts come from the parametric generators only.
  const parts = deriveParts(modules);

  // 4. BOM: aggregation of those parts, no new dimensions.
  const bom = deriveBom(parts);
  const totals = bomTotals(bom);
  const cutting = cuttingGroups(bom, def.sheet ?? {});

  // 5. Validation: same derived data, third consumer.
  const issues = validateProject(room, modules);

  // 6. Corner + occupancy evidence, derived.
  const reservations = computeReservations(room, modules);
  const corners = room.corners.map((corner) => ({
    ...corner,
    occupancy: cornerOccupancy(room, modules, corner),
    reservationAfter: reservations.get(corner.wallAfter),
  }));
  const occupancy = room.walls.map((w) => {
    const occ = wallOccupancy(room, modules, w.id);
    const res = reservations.get(w.id) ?? { atStart: 0, atEnd: 0 };
    return { ...occ, atStart: res.atStart, atEnd: res.atEnd, usable: w.length - res.atStart - res.atEnd };
  });

  return {
    definition: def,
    runs,
    room,
    modules,
    parts,
    bom,
    totals,
    cutting,
    issues,
    reservations,
    corners,
    occupancy,
  };
}

/**
 * Change one module's parameters and rebuild. This is the only supported way
 * to mutate a project, which is what guarantees propagation.
 *
 * @returns {object} a fresh derived bundle
 */
export function updateModule(definition, moduleId, patch) {
  const found = definition.modules.some((m) => m.id === moduleId);
  if (!found) throw new Error(`updateModule: no module "${moduleId}"`);
  const next = {
    ...definition,
    modules: definition.modules.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            ...patch,
            parameters: { ...(m.parameters ?? {}), ...(patch.parameters ?? {}) },
          }
        : m,
    ),
  };
  return { definition: next, derived: buildProject(next) };
}

/** Change a wall endpoint and rebuild - proves corners are recalculated. */
export function updateWall(definition, wallId, patch) {
  const found = definition.room.walls.some((w) => w.id === wallId);
  if (!found) throw new Error(`updateWall: no wall "${wallId}"`);
  const next = {
    ...definition,
    room: {
      ...definition.room,
      walls: definition.room.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)),
    },
  };
  return { definition: next, derived: buildProject(next) };
}
