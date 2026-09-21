/**
 * CP-01 section 11: the mandatory real acceptance fixture.
 *
 *   L-shaped kitchen
 *   Wall A: 2500 mm
 *   Wall B: 1500 mm
 *   Corner: 90 deg
 *
 * Each test below is one of the ten numbered proofs the checkpoint requires.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, updateModule, updateWall } from '../model/project.js';
import { lineIntersection } from '../geometry/intersect.js';
import { findOverlaps } from '../placement/placement.js';
import { moduleFootprint } from '../furniture/moduleGeometry.js';

const FIXTURE_URL = new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url);
const FIXTURE = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));

const TOL = 1e-9;
const near = (actual, expected, tol = TOL, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

const base = () => buildProject(FIXTURE);

/** Perpendicular distance from a point to a wall's axis line. */
function distanceToWallAxis(wall, point) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  return Math.abs((point.x - wall.start.x) * (-dy / len) + (point.y - wall.start.y) * (dx / len));
}

// ---------------------------------------------------------------------------
// 1. Both walls are mathematically correct.
// ---------------------------------------------------------------------------
test('fixture proof 1: both walls are mathematically correct', () => {
  const { room } = base();
  const a = room.wall('wall-a');
  const b = room.wall('wall-b');

  near(a.length, 2500, TOL, 'Wall A length');
  near(b.length, 1500, TOL, 'Wall B length');
  near(a.angleDeg, 0, TOL, 'Wall A angle');
  near(b.angleDeg, 90, TOL, 'Wall B angle');
  // Perpendicularity is measured, not assumed.
  near(Math.abs(a.direction.x * b.direction.x + a.direction.y * b.direction.y), 0, TOL, 'A . B = 0');
});

// ---------------------------------------------------------------------------
// 2. The common corner is calculated, not manually placed.
// ---------------------------------------------------------------------------
test('fixture proof 2: the corner is calculated, not authored', () => {
  const { room } = base();
  const corner = room.cornerAtEndOf('wall-a');
  assert.ok(corner, 'the wall-a/wall-b corner must exist');

  near(corner.point.x, 2500);
  near(corner.point.y, 0);
  near(corner.turnDeg, 90, TOL, 'the corner is a right angle');

  // Independently recompute it and require agreement.
  const independent = lineIntersection(
    room.wall('wall-a').start,
    room.wall('wall-a').end,
    room.wall('wall-b').start,
    room.wall('wall-b').end,
  );
  near(corner.point.x, independent.x);
  near(corner.point.y, independent.y);

  // The fixture JSON must not contain the corner point anywhere.
  const raw = readFileSync(FIXTURE_URL, 'utf8');
  assert.ok(!/corner/i.test(raw), 'the fixture stores endpoints only, never a corner');
});

test('fixture proof 2b: moving a wall endpoint moves the corner', () => {
  // Slide Wall B 300 mm along -X; Wall C follows so the room stays closed.
  const step1 = updateWall(FIXTURE, 'wall-b', { start: { x: 2200, y: 0 }, end: { x: 2200, y: 1500 } });
  const moved = updateWall(step1.definition, 'wall-c', { start: { x: 2200, y: 1500 } }).derived;

  near(moved.room.cornerAtEndOf('wall-a').point.x, 2200, TOL, 'corner follows Wall B');
  near(moved.room.cornerAtEndOf('wall-a').point.y, 0);
  near(moved.room.wall('wall-b').length, 1500, TOL, 'Wall B keeps its 1500 mm length');
  near(moved.room.wall('wall-c').length, 1200, TOL, 'Wall C absorbed the move');
});

// ---------------------------------------------------------------------------
// 3 & 4. Modules align to their own wall.
// ---------------------------------------------------------------------------
for (const [wallId, proofNo] of [
  ['wall-a', 3],
  ['wall-b', 4],
]) {
  test(`fixture proof ${proofNo}: ${wallId} modules align to ${wallId}`, () => {
    const { room, modules } = base();
    const wall = room.wall(wallId);
    const onWall = modules.filter((m) => m.wallId === wallId);
    assert.ok(onWall.length > 0, `${wallId} must carry modules`);

    for (const m of onWall) {
      const fp = moduleFootprint(room, m);
      const [backLeft, backRight, frontRight, frontLeft] = fp;

      // The back edge lies exactly on the wall axis.
      near(distanceToWallAxis(wall, backLeft), 0, 1e-9, `${m.id} back-left on the wall axis`);
      near(distanceToWallAxis(wall, backRight), 0, 1e-9, `${m.id} back-right on the wall axis`);

      // The back edge starts at the module's wallOffset, measured along the wall.
      const rel = { x: backLeft.x - wall.start.x, y: backLeft.y - wall.start.y };
      const along = rel.x * wall.direction.x + rel.y * wall.direction.y;
      near(along, m.wallOffset, 1e-9, `${m.id} starts at its wallOffset`);

      // The depth runs along the wall's inward normal.
      const dx = frontLeft.x - backLeft.x;
      const dy = frontLeft.y - backLeft.y;
      const len = Math.hypot(dx, dy);
      near(len, m.depth, 1e-9, `${m.id} depth`);
      near(dx / len, wall.inwardNormal.x, 1e-9, `${m.id} depth follows the inward normal`);
      near(dy / len, wall.inwardNormal.y, 1e-9, `${m.id} depth follows the inward normal`);

      // The module is rotated with the wall.
      const across = { x: backRight.x - backLeft.x, y: backRight.y - backLeft.y };
      const acrossLen = Math.hypot(across.x, across.y);
      near(acrossLen, m.width, 1e-9, `${m.id} width along the wall`);
      near(across.x / acrossLen, wall.direction.x, 1e-9, `${m.id} oriented to the wall`);
      near(across.y / acrossLen, wall.direction.y, 1e-9, `${m.id} oriented to the wall`);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Modules do not unintentionally overlap.
// ---------------------------------------------------------------------------
test('fixture proof 5: no module overlaps another', () => {
  const { room, modules, issues } = base();
  assert.deepEqual(findOverlaps(room, modules), []);
  assert.deepEqual(
    issues.filter((i) => i.code === 'OVERLAP'),
    [],
  );
  assert.deepEqual(
    issues.filter((i) => i.severity === 'error'),
    [],
    'the fixture must be error free',
  );
});

// ---------------------------------------------------------------------------
// 6. Corner occupancy / the corner module attaches correctly.
// ---------------------------------------------------------------------------
test('fixture proof 6: corner occupancy attaches correctly', () => {
  const { room, modules, corners } = base();
  const corner = corners.find((c) => c.id === 'wall-a__wall-b');
  assert.ok(corner, 'the L corner must be present');

  assert.ok(corner.occupancy, 'the corner must be owned by exactly one module');
  assert.equal(corner.occupancy.moduleId, 'a4', 'the last Wall A cabinet owns the corner');
  assert.equal(corner.occupancy.wallId, 'wall-a');
  near(corner.occupancy.depth, 560);

  // Wall B's run must stand off by exactly that depth - derived, not typed.
  const b1 = modules.find((m) => m.id === 'b1');
  near(b1.wallOffset, corner.occupancy.depth, TOL, 'Wall B setback equals the corner depth');

  // Wall A's run reaches the corner exactly.
  const a4 = modules.find((m) => m.id === 'a4');
  near(a4.wallOffset + a4.width, room.wall('wall-a').length, TOL, 'Wall A run closes on the corner');
});

// ---------------------------------------------------------------------------
// 7. Changing one cabinet width changes its geometry.
// ---------------------------------------------------------------------------
test('fixture proof 7: changing a cabinet width changes its geometry', () => {
  const before = base();
  const { derived: after } = updateModule(FIXTURE, 'a3', { width: 500 });

  const partsOf = (bundle, moduleId) => bundle.parts.filter((p) => p.moduleId === moduleId);
  const beforeParts = partsOf(before, 'a3');
  const afterParts = partsOf(after, 'a3');

  const dim = (parts, role) => {
    const p = parts.find((x) => x.role === role);
    return `${p.length}x${p.width}x${p.thickness}`;
  };

  assert.notEqual(dim(afterParts, 'bottom'), dim(beforeParts, 'bottom'), 'bottom regenerates');
  assert.notEqual(dim(afterParts, 'facade'), dim(beforeParts, 'facade'), 'facade regenerates');
  assert.notEqual(dim(afterParts, 'rail-top'), dim(beforeParts, 'rail-top'), 'rail regenerates');
  assert.equal(dim(afterParts, 'bottom'), '464x560x18', 'bottom = width - 2 x 18');
  assert.equal(dim(afterParts, 'facade'), '500x720x18', 'facade follows the new width');

  // Width-independent panels stay put.
  assert.equal(dim(afterParts, 'side-left'), dim(beforeParts, 'side-left'));

  // The rendered box follows the same numbers.
  const box = afterParts.find((p) => p.role === 'facade').box;
  near(box.max.x - box.min.x, 500, TOL, 'the view box follows the parameter');
});

// ---------------------------------------------------------------------------
// 8. Dependent placement is recalculated.
// ---------------------------------------------------------------------------
test('fixture proof 8: dependent placement is recalculated', () => {
  const before = base();
  const { derived: after } = updateModule(FIXTURE, 'a3', { width: 500 });

  const off = (bundle, id) => bundle.modules.find((m) => m.id === id).wallOffset;

  // Shrinking a3 by 100 mm pulls a4 (and the corner) back by 100 mm.
  near(off(before, 'a4'), 1800);
  near(off(after, 'a4'), 1700, TOL, 'a4 shifts when a3 shrinks');
  near(off(after, 'a3'), 1200);

  // The run no longer closes on the corner, and validation notices.
  const a4 = after.modules.find((m) => m.id === 'a4');
  near(a4.wallOffset + a4.width, 2400, TOL, 'the run now stops 100 mm short');
  const gap = after.issues.find((i) => i.code === 'RUN_GAP' && i.subject === 'wall-a');
  assert.ok(gap, 'the 100 mm gap must be reported');
  assert.equal(gap.severity, 'warning');
  assert.match(gap.message, /100 mm/);

  // Wall B's reservation is recomputed from the new corner geometry.
  const resB = after.reservations.get('wall-b');
  near(resB.atStart, 560, TOL, 'Wall B stand-off is recalculated');
  near(off(after, 'b1'), 560);

  // Everything is still collision free.
  assert.deepEqual(findOverlaps(after.room, after.modules), []);
});

// ---------------------------------------------------------------------------
// 9. Parts and BOM are regenerated from the same model.
// ---------------------------------------------------------------------------
test('fixture proof 9: Parts and BOM are regenerated', () => {
  const before = base();
  const { derived: after } = updateModule(FIXTURE, 'a3', { width: 500 });

  assert.equal(before.parts.length, 30, '6 modules x 5 parts');
  assert.equal(after.parts.length, 30, 'the part count is structural, not dimensional');

  const signature = (bundle) =>
    bundle.bom.map((l) => `${l.material}|${l.thickness}|${l.length}x${l.width}|x${l.count}`).join('\n');
  assert.notEqual(signature(after), signature(before), 'the BOM must change');

  // The shared 564 mm bottom loses one piece and a new 464 mm line appears.
  const line = (bundle, dim) => bundle.bom.find((l) => `${l.length}x${l.width}` === dim);
  assert.equal(line(before, '564x560').count, 3, 'a1, a2, a3 share the 600 mm carcass cut');
  assert.equal(line(after, '564x560').count, 2, 'a3 has left that line');
  assert.equal(line(after, '464x560').count, 1, 'a3 now cuts a 500 mm carcass');
  assert.equal(line(after, '464x560').length, 464, 'bottom = 500 - 2 x 18');

  // Totals follow the parts, they are not maintained separately.
  const area = (bundle) => bundle.totals.areaM2;
  assert.ok(area(after) < area(before), 'a narrower cabinet means less board');
  const recomputed = after.parts.reduce((s, p) => s + (p.length * p.width) / 1e6, 0);
  near(after.totals.areaM2, recomputed, 1e-9, 'totals are the sum of the parts');
});

// ---------------------------------------------------------------------------
// 10. No AI model is required to preserve geometric validity.
// ---------------------------------------------------------------------------
test('fixture proof 10: the kernel is deterministic and dependency free', () => {
  const a = base();
  const b = base();

  // Same input, byte-identical output. No randomness, no inference.
  const strip = (bundle) =>
    JSON.stringify({
      modules: bundle.modules,
      parts: bundle.parts,
      bom: bundle.bom,
      totals: bundle.totals,
      corners: bundle.corners.map((c) => ({ id: c.id, point: c.point, turnDeg: c.turnDeg })),
      issues: bundle.issues,
    });
  assert.equal(strip(a), strip(b), 'two builds must be identical');

  // Nothing in the kernel reaches outside the repository at runtime.
  const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies, undefined, 'no runtime dependencies');
  assert.equal(pkg.devDependencies, undefined, 'no dev dependencies either');
});

// ---------------------------------------------------------------------------
// Fixture integrity.
// ---------------------------------------------------------------------------
test('fixture: the 2500 x 1500 L-shaped room is closed and error free', () => {
  const bundle = base();
  assert.equal(bundle.room.walls.length, 6, 'an L-shaped room has six inner walls');
  assert.equal(bundle.issues.length, 0, `unexpected issues: ${JSON.stringify(bundle.issues)}`);
  assert.equal(bundle.modules.length, 6);

  // The two run walls are fully packed.
  const occupancy = Object.fromEntries(bundle.occupancy.map((o) => [o.wallId, o]));
  assert.deepEqual(occupancy['wall-a'].occupied, [{ from: 0, to: 2500 }]);
  assert.deepEqual(occupancy['wall-b'].occupied, [{ from: 560, to: 1500 }]);
  assert.deepEqual(occupancy['wall-b'].free, [{ from: 0, to: 560 }], 'the corner setback is the only gap');
});
