/**
 * Validation branch of the canonical flow (CP-01 section 8).
 *
 * Validation reads the SAME derived data as the view and the BOM. It has no
 * private copy of any dimension.
 */

import { findOverlaps, moduleWithinWall, wallOccupancy, computeReservations } from '../placement/placement.js';

/**
 * @returns {Array<{code,severity,message,subject}>}
 */
export function validateProject(room, modules) {
  const issues = [];

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
    const reservations = computeReservations(room, modules).get(wall.id);
    for (const gap of occupancy.free) {
      // A free interval that is fully covered by a neighbour's corner
      // reservation is not a defect - that space belongs to the other run.
      const reserved =
        gap.from <= reservations.atStart + 1e-6 && gap.to <= reservations.atStart + 1e-6;
      const atEndReserved =
        gap.from >= wall.length - reservations.atEnd - 1e-6 &&
        reservations.atEnd > 0;
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
