/**
 * CP-02 — multi-run + opening-aware placement.
 *
 * Builds on CP-01. Verifies:
 *  1. a run routes around a door on its own wall,
 *  2. `startPoint: 'end'` packs from the right end,
 *  3. two runs in one project do not overlap (P/two-row),
 *  4. a run that cannot fit yields CANNOT_PLACE instead of a silent overflow,
 *  5. a door-sized gap is not reported as a run gap.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject } from '../model/project.js';
import { findOverlaps } from '../placement/placement.js';

const TOL = 1e-9;
const near = (actual, expected, tol = TOL, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

const FIXTURE = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-multirun/project.json', import.meta.url), 'utf8'),
);

const rectRoom = (w, h, openings = []) => ({
  id: 'r',
  height: 2500,
  walls: [
    { id: 'a', start: { x: 0, y: 0 }, end: { x: w, y: 0 }, thickness: 100 },
    { id: 'b', start: { x: w, y: 0 }, end: { x: w, y: h }, thickness: 100 },
    { id: 'c', start: { x: w, y: h }, end: { x: 0, y: h }, thickness: 100 },
    { id: 'd', start: { x: 0, y: h }, end: { x: 0, y: 0 }, thickness: 100 },
  ],
  openings,
});

const cab = (id, wallId, width, extra = {}) => ({
  id,
  type: 'base-cabinet',
  width,
  height: 720,
  depth: 560,
  wallId,
  autoOffset: true,
  ...extra,
});

test('cp02: a run routes around a door on its own wall', () => {
  const bundle = buildProject(FIXTURE);
  const offsets = Object.fromEntries(
    bundle.modules.filter((m) => m.wallId === 'wall-a').map((m) => [m.id, m.wallOffset]),
  );
  assert.deepEqual(offsets, { a1: 0, a2: 600, a3: 2000 }, 'a3 jumps over the door');

  // No module may cover the door.
  const door = bundle.room.openings.find((o) => o.id === 'door-1');
  const blocked = bundle.issues.filter((i) => i.code === 'OPENING_BLOCKED');
  assert.deepEqual(blocked, []);
  assert.ok(door, 'door present');

  // The run is still collision free.
  assert.deepEqual(findOverlaps(bundle.room, bundle.modules), []);
});

test('cp02: a door-sized gap is not reported as a run gap, a real gap is', () => {
  const bundle = buildProject(FIXTURE);
  const gaps = bundle.issues.filter((i) => i.code === 'RUN_GAP' && i.subject === 'wall-a');
  // The trailing 400 mm (2600..3000) is a genuine gap; the 1200..2000 door is not.
  assert.equal(gaps.length, 1, JSON.stringify(bundle.issues));
  assert.match(gaps[0].message, /400 mm/);
  assert.ok(!bundle.issues.some((i) => i.code === 'RUN_GAP' && /800 mm/.test(i.message)), 'door not flagged');
  assert.ok(!bundle.issues.some((i) => i.severity === 'error'), 'no errors in the fixture');
});

test('cp02: two runs in one project do not overlap', () => {
  const bundle = buildProject(FIXTURE);
  const a = bundle.modules.filter((m) => m.wallId === 'wall-a');
  const c = bundle.modules.filter((m) => m.wallId === 'wall-c');
  assert.equal(a.length, 3);
  assert.equal(c.length, 2);
  assert.deepEqual(findOverlaps(bundle.room, bundle.modules), [], 'opposite runs stay apart');

  // The top run sits on wall-c (depth 350), the bottom on wall-a (depth 560).
  const c1 = bundle.modules.find((m) => m.id === 'c1');
  near(c1.depth, 350);
  assert.equal(c1.wallId, 'wall-c');
});

test('cp02: startPoint end packs from the right end', () => {
  const bundle = buildProject({
    id: 'end',
    room: rectRoom(3000, 2000),
    runs: [{ wallId: 'a', startPoint: 'end' }],
    modules: [cab('m1', 'a', 600), cab('m2', 'a', 600)],
  });
  const offsets = Object.fromEntries(bundle.modules.map((m) => [m.id, m.wallOffset]));
  assert.deepEqual(offsets, { m1: 2400, m2: 1800 }, 'fills from the right');
});

test('cp02: a run that cannot fit reports CANNOT_PLACE', () => {
  const bundle = buildProject({
    id: 'nospace',
    room: rectRoom(3000, 2000, [
      { id: 'door', kind: 'door', wallId: 'a', offset: 1200, width: 800, sillHeight: 0, headHeight: 2050 },
    ]),
    modules: [cab('m1', 'a', 1000), cab('m2', 'a', 1000), cab('m3', 'a', 1000)],
  });
  const issues = bundle.issues.filter((i) => i.code === 'CANNOT_PLACE');
  assert.equal(issues.length, 1, JSON.stringify(bundle.issues));
  assert.equal(issues[0].subject, 'm3');
  assert.equal(issues[0].severity, 'error');

  // The two that did fit must not overlap and must avoid the door.
  const placed = bundle.modules.filter((m) => m.id !== 'm3');
  assert.deepEqual(findOverlaps(bundle.room, placed), []);
  assert.deepEqual(placed.map((m) => m.wallOffset), [0, 2000]);
});

test('cp02: CP-01 L-shaped fixture still packs identically (no regression)', () => {
  const l = JSON.parse(
    readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
  );
  const bundle = buildProject(l);
  const offsets = Object.fromEntries(bundle.modules.map((m) => [m.id, m.wallOffset]));
  assert.deepEqual(offsets, { a1: 0, a2: 600, a3: 1200, a4: 1800, b1: 560, b2: 1030 });
});
