/**
 * Auto blind-corner derivation (CP-13).
 *
 * Turns a declared corner base cabinet into a derived blind-corner model whose
 * accessible facade width comes from the NEIGHBOURING run's depth - never typed
 * twice and never a hard-coded 560 constant.
 *
 *   blindWidth  = adjacentDepth + clearance
 *   facadeWidth = ownerCabinet.width - blindWidth
 *
 * The derivation runs AFTER XY placement (it reads placed footprints) and BEFORE
 * parts generation, so the same facadeWidth flows into parts, BOM, 3D/GLB,
 * checklist and validation. Nothing here is journaled - it is recomputed.
 */

import { cornerOccupancy } from './placement.js';

const END_TOL = 1; // mm - cabinet is "at" a wall end within this tolerance
const RIGHT_ANGLE_TOL = 0.5; // deg

/** True when a module declares an AUTO blind corner (legacy `corner:true` is not). */
export function isAutoCorner(module) {
  const c = module?.parameters?.corner;
  return !!c && typeof c === 'object' && c.auto === true;
}

/**
 * Derive blind-corner geometry for every auto corner cabinet.
 * @returns {Map<string, object>} moduleId -> cornerDerived
 */
export function deriveBlindCorners(room, modules) {
  const out = new Map();
  for (const m of modules) {
    if (isAutoCorner(m)) out.set(m.id, deriveOne(room, modules, m));
  }
  return out;
}

function deriveOne(room, modules, m) {
  const clearance = Number(m.parameters.corner.clearance) || 0;
  const base = { ownerWallId: m.wallId, clearance };
  const wall = room.wall(m.wallId);
  if (!wall) return { ...base, error: 'CORNER_OWNER_INVALID' };

  // Which end of the owner wall does the cabinet reach? The corner lives there.
  const off = m.wallOffset ?? 0;
  const atEnd = Math.abs(off + m.width - wall.length) <= END_TOL;
  const atStart = Math.abs(off) <= END_TOL;

  let corner = null;
  let blindSide = null;
  let adjacentWallId = null;
  if (atEnd) {
    corner = room.cornerAtEndOf(wall.id);
    blindSide = 'end';
    adjacentWallId = corner?.wallAfter ?? null;
  } else if (atStart) {
    corner = room.cornerAtStartOf(wall.id);
    blindSide = 'start';
    adjacentWallId = corner?.wallBefore ?? null;
  }
  if (!corner || !adjacentWallId) {
    return { ...base, error: 'CORNER_OWNER_INVALID' }; // not touching a room corner
  }

  const ctx = { ...base, cornerId: corner.id, adjacentWallId, blindSide };

  // v1 supports 90 deg corners only.
  if (Math.abs(Math.abs(corner.turnDeg) - 90) > RIGHT_ANGLE_TOL) {
    return { ...ctx, error: 'CORNER_ANGLE_UNSUPPORTED' };
  }

  // The cabinet must actually own the corner it claims.
  const occ = cornerOccupancy(room, modules, corner);
  if (!occ || occ.moduleId !== m.id) {
    return { ...ctx, error: 'CORNER_OWNER_INVALID' };
  }

  // Neighbouring depth: the adjacent-wall module nearest the corner.
  const adjWall = room.wall(adjacentWallId);
  const adj = modules.filter((x) => x.wallId === adjacentWallId);
  if (!adj.length || !adjWall) {
    return { ...ctx, error: 'CORNER_NEIGHBOR_MISSING' };
  }
  const cornerAtAdjStart = corner.wallAfter === adjacentWallId;
  const nearest = adj
    .map((x) => {
      const xo = x.wallOffset ?? 0;
      const dist = cornerAtAdjStart ? xo : adjWall.length - (xo + x.width);
      return { x, dist };
    })
    .sort((a, b) => a.dist - b.dist || (a.x.id < b.x.id ? -1 : 1))[0].x;

  const adjacentDepth = nearest.depth;
  const blindWidth = adjacentDepth + clearance;
  const facadeWidth = m.width - blindWidth;
  const derived = {
    ...ctx,
    adjacentModuleId: nearest.id,
    adjacentDepth,
    blindWidth,
    facadeWidth,
  };
  if (!(facadeWidth > 0)) return { ...derived, error: 'CORNER_FACADE_INVALID' };
  return derived;
}
