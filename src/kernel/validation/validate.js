/**
 * Validation branch of the canonical flow (CP-01 section 8).
 *
 * Validation reads the SAME derived data as the view and the BOM. It has no
 * private copy of any dimension.
 */

import { findOverlaps, moduleWithinWall, wallOccupancy, computeReservations } from '../placement/placement.js';
import { installationValid } from '../model/installation.js';

/**
 * @returns {Array<{code,severity,message,subject}>}
 */
export function validateProject(room, modules, opts = {}) {
  const issues = [];
  const installation = opts.installation;

  // CP-12 vertical validation (stable codes, deterministic messages).
  if (installation && !installationValid(installation)) {
    issues.push({
      code: 'VERTICAL_PARAM_INVALID',
      severity: 'error',
      subject: 'installation',
      message: 'installation plinthHeight/worktopThickness must be finite numbers >= 0',
    });
  }
  for (const m of modules) {
    if (m.type === 'wall-cabinet' && m.bottomZ == null) {
      issues.push({
        code: 'WALL_CABINET_NO_ANCHOR',
        severity: 'error',
        subject: m.id,
        message: `wall cabinet "${m.id}" needs a finite parameters.mountHeight >= 0`,
      });
    }
    if (m.topZ != null && m.topZ > room.height) {
      issues.push({
        code: 'MODULE_ABOVE_ROOM',
        severity: 'error',
        subject: m.id,
        message: `module "${m.id}" top ${m.topZ} mm exceeds room height ${room.height} mm`,
      });
    }
  }
  for (const w of room.walls) {
    const bases = modules.filter((x) => x.wallId === w.id && x.type === 'base-cabinet');
    const heights = [...new Set(bases.map((x) => x.height))];
    if (heights.length > 1) {
      issues.push({
        code: 'WORKTOP_UNLEVEL',
        severity: 'error',
        subject: w.id,
        message: `wall "${w.id}" base heights incompatible (${heights.join(', ')}) - one worktop plane impossible`,
      });
    }
  }
  const reservations = computeReservations(room, modules);

  for (const m of modules) {
    if (!room.wall(m.wallId)) {
      issues.push({
        code: 'UNKNOWN_WALL',
        severity: 'error',
        subject: m.id,
        message: `Module "${m.id}" references unknown wall "${m.wallId}"`,
      });
    }
  }

  for (const m of modules) {
    if (!room.wall(m.wallId)) continue;
    if (m.placementError === 'no-space') {
      issues.push({
        code: 'CANNOT_PLACE',
        severity: 'error',
        subject: m.id,
        message:
          `Module "${m.id}" (${m.width} mm) cannot fit on wall "${m.wallId}" ` +
          `after routing around openings and corner reservations`,
      });
      continue;
    }
    if (!moduleWithinWall(room, m)) {
      const wall = room.wall(m.wallId);
      issues.push({
        code: 'OUT_OF_WALL',
        severity: 'error',
        subject: m.id,
        message:
          `Module "${m.id}" (${m.width} mm at offset ${m.wallOffset}) exceeds ` +
          `wall "${m.wallId}" (length ${wall.length} mm)`,
      });
    }
  }

  for (const { a, b } of findOverlaps(room, modules)) {
    issues.push({
      code: 'OVERLAP',
      severity: 'error',
      subject: `${a}+${b}`,
      message: `Modules "${a}" and "${b}" overlap in plan`,
    });
  }

  // An explicitly placed module may land inside a corner reservation zone
  // (the stand-off owed to the run that owns the corner). Flag it.
  for (const m of modules) {
    if (!room.wall(m.wallId)) continue;
    if (m.autoOffset) continue; // auto-packed modules are routed around reservations
    const wall = room.wall(m.wallId);
    const res = reservations.get(m.wallId) ?? { atStart: 0, atEnd: 0 };
    const from = m.wallOffset ?? 0;
    const to = from + m.width;
    const inStart = from < res.atStart - 1e-6;
    const inEnd = to > wall.length - res.atEnd + 1e-6 && res.atEnd > 0;
    if (inStart || inEnd) {
      issues.push({
        code: 'CORNER_CONFLICT',
        severity: 'error',
        subject: m.id,
        message:
          `Module "${m.id}" sits inside the corner reservation on wall "${m.wallId}" ` +
          `(reserved ${Math.round(res.atStart)} mm at start, ${Math.round(res.atEnd)} mm at end)`,
      });
    }
  }

  for (const opening of room.openings) {
    const blocked = [{ from: opening.offset, to: opening.offset + opening.width }];
    for (const m of modules) {
      if (m.wallId !== opening.wallId) continue;
      const from = m.wallOffset ?? 0;
      const to = from + m.width;
      const overlapsOpening = blocked.some((b) => from < b.to - 1e-6 && to > b.from + 1e-6);
      if (overlapsOpening) {
        issues.push({
          code: 'OPENING_BLOCKED',
          severity: 'error',
          subject: m.id,
          message:
            `Module "${m.id}" covers ${opening.kind} "${opening.id}" on wall "${opening.wallId}"`,
        });
      }
    }
  }

  for (const wall of room.walls) {
    const occupancy = wallOccupancy(room, modules, wall.id);
    const res = reservations.get(wall.id) ?? { atStart: 0, atEnd: 0 };
    for (const gap of occupancy.free) {
      // A free interval that is fully covered by a neighbour's corner
      // reservation is not a defect - that space belongs to the other run.
      const reserved =
        gap.from <= res.atStart + 1e-6 && gap.to <= res.atStart + 1e-6;
      const atEndReserved =
        gap.from >= wall.length - res.atEnd - 1e-6 &&
        res.atEnd > 0;
      // A gap that is exactly a door/window is intentional, not a run gap.
      const isOpening = room.openingsOn(wall.id).some(
        (o) => gap.from >= o.offset - 1e-6 && gap.to <= o.offset + o.width + 1e-6,
      );
      if (reserved || atEndReserved || isOpening) continue;
      // Only report gaps on walls that actually carry modules.
      if (!occupancy.occupied.length) continue;
      issues.push({
        code: 'RUN_GAP',
        severity: 'warning',
        subject: wall.id,
        message:
          `Wall "${wall.id}" has an empty ${Math.round(gap.to - gap.from)} mm gap ` +
          `at offset ${Math.round(gap.from)}-${Math.round(gap.to)}`,
      });
    }
  }

  return issues;
}

export const hasErrors = (issues) => issues.some((i) => i.severity === 'error');
