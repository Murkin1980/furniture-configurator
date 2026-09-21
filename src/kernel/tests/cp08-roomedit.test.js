/**
 * CP-08 - room-shape editing (drag corners, Shift-snap 90°).
 *
 * moveCorner() rewrites only wall endpoints; the kernel re-derives corners,
 * turn angles and placement. Snap math is checked against the CP-01 corner
 * derivation (turnDeg), so the 90° guarantee comes from the kernel's own
 * geometry, not from the editor.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, moveCorner } from '../index.js';

const TOL = 1e-6;

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

test('cp08: free corner drag keeps the loop closed and rebuilds lengths', () => {
  const next = moveCorner(CP01, 0, { x: 2600, y: 0 });
  assert.deepEqual(next.room.walls[0].end, { x: 2600, y: 0 });
  assert.deepEqual(next.room.walls[1].start, { x: 2600, y: 0 });
  const room = buildProject(next).room;
  assert.ok(Math.abs(room.wall('wall-a').length - 2600) <= TOL, 'wall-a re-derived to 2600');
});

test('cp08: snap90 makes the kernel derive a 90° corner', () => {
  const next = moveCorner(CP01, 0, { x: 2600, y: 400 }, { snap90: true });
  const C = next.room.walls[0].end;
  const S = CP01.room.walls[0].start;
  const E = CP01.room.walls[1].end;
  const dot = (C.x - S.x) * (E.x - C.x) + (C.y - S.y) * (E.y - C.y);
  assert.ok(Math.abs(dot) <= 1e-3, `thales dot ~0, got ${dot}`);
  const corner = buildProject(next).room.corners[0];
  assert.ok(Math.abs(corner.turnDeg - 90) <= 1e-6, `turnDeg ${corner.turnDeg}`);
});

test('cp08: shrinking a wall by dragging rebuilds placement', () => {
  const next = moveCorner(CP01, 0, { x: 2000, y: 0 });
  const codes = buildProject(next).issues.map((i) => i.code);
  assert.ok(codes.includes('CANNOT_PLACE'), JSON.stringify(codes));
});

test('cp08: invalid corner index throws; drag is deterministic', () => {
  assert.throws(() => moveCorner(CP01, 99, { x: 0, y: 0 }), /out of range/);
  const a = moveCorner(CP01, 0, { x: 2400, y: 100 }, { snap90: true });
  const b = moveCorner(CP01, 0, { x: 2400, y: 100 }, { snap90: true });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
