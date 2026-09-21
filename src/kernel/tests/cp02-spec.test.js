/**
 * CP-02 (official spec, docs/checkpoints/CP-02-SPEC.md) acceptance tests.
 *
 * Covers the spec's eight fixture cases plus the placement API determinism and
 * invalid-operation handling. Builds on CP-01 without changing it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildProject,
  updateModule,
  updateWall,
  placeModule,
  removeModule,
  reorderModule,
  moveModule,
  normalizeProject,
  findOverlaps,
} from '../index.js';

const TOL = 1e-9;
const near = (a, e, tol = TOL, msg = '') => assert.ok(Math.abs(a - e) <= tol, `${msg} expected ~${e}, got ${a}`);

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

const rect = (w, h) => ({
  id: 'r',
  height: 2500,
  walls: [
    { id: 'a', start: { x: 0, y: 0 }, end: { x: w, y: 0 }, thickness: 100 },
    { id: 'b', start: { x: w, y: 0 }, end: { x: w, y: h }, thickness: 100 },
    { id: 'c', start: { x: w, y: h }, end: { x: 0, y: h }, thickness: 100 },
    { id: 'd', start: { x: 0, y: h }, end: { x: 0, y: 0 }, thickness: 100 },
  ],
});

const cab = (id, width, depth = 560) => ({ id, type: 'base-cabinet', width, height: 720, depth });

// --- 1. straight layout -------------------------------------------------
test('cp02 spec: straight kitchen packs sequentially', () => {
  const def = {
    id: 'straight',
    room: rect(4000, 2000),
    runs: [{ wallId: 'a', startPoint: 'start', moduleIds: ['s1', 's2', 's3'] }],
    modules: [cab('s1', 800), cab('s2', 800), cab('s3', 800)],
  };
  const b = buildProject(def);
  assert.deepEqual(b.modules.map((m) => m.wallOffset), [0, 800, 1600]);
  assert.deepEqual(b.issues.filter((i) => i.severity === 'error'), []);
});

// --- 2. L layout (CP-01 fixture unchanged) ------------------------------
test('cp02 spec: L-shaped kitchen still works', () => {
  const b = buildProject(CP01);
  const off = Object.fromEntries(b.modules.map((m) => [m.id, m.wallOffset]));
  assert.deepEqual(off, { a1: 0, a2: 600, a3: 1200, a4: 1800, b1: 560, b2: 1030 });
});

// --- 3. P layout (two parallel runs) ------------------------------------
test('cp02 spec: P-shaped (two parallel runs) do not overlap', () => {
  const b = buildProject({
    id: 'p',
    room: rect(3000, 2000),
    runs: [
      { wallId: 'a', startPoint: 'start', moduleIds: ['p1', 'p2'] },
      { wallId: 'c', startPoint: 'start', moduleIds: ['p3', 'p4'] },
    ],
    modules: [cab('p1', 700), cab('p2', 700), cab('p3', 350, 350), cab('p4', 350, 350)],
  });
  assert.equal(b.modules.length, 4);
  // Runs on opposite walls stay apart (depths 560 + 350 < 2000).
  assert.deepEqual(findOverlaps(b.room, b.modules), []);
  assert.deepEqual(b.issues.filter((i) => i.severity === 'error'), []);
});

// --- 4. wall-width overflow --------------------------------------------
test('cp02 spec: a run wider than its wall reports CANNOT_PLACE', () => {
  const b = buildProject({
    id: 'overflow',
    room: rect(2000, 2000),
    runs: [{ wallId: 'a', startPoint: 'start', moduleIds: ['o1', 'o2'] }],
    modules: [cab('o1', 1200), cab('o2', 1200)],
  });
  const codes = b.issues.map((i) => i.code);
  assert.ok(codes.includes('CANNOT_PLACE'), JSON.stringify(b.issues));
});

// --- 5. corner conflict --------------------------------------------------
test('cp02 spec: explicit module in a corner reservation -> CORNER_CONFLICT', () => {
  const def = {
    ...CP01,
    modules: [
      ...CP01.modules,
      { id: 'bx', type: 'base-cabinet', width: 400, height: 720, depth: 560, wallId: 'wall-b', wallOffset: 0, autoOffset: false },
    ],
  };
  const b = buildProject(def);
  const codes = b.issues.map((i) => i.code);
  assert.ok(codes.includes('CORNER_CONFLICT'), JSON.stringify(b.issues));
});

// --- 6. move a module between runs --------------------------------------
test('cp02 spec: moving a module between runs is deterministic', () => {
  const def = {
    id: 'move',
    room: rect(4000, 2000),
    runs: [
      { wallId: 'a', startPoint: 'start', moduleIds: ['m1', 'm2'] },
      { wallId: 'b', startPoint: 'start', moduleIds: ['m3'] },
    ],
    modules: [cab('m1', 800), cab('m2', 800), cab('m3', 800)],
  };
  const doMove = () => moveModule(def, 'm3', { wallId: 'a' }).derived;
  const first = doMove();
  const second = doMove();
  assert.equal(JSON.stringify(first.modules), JSON.stringify(second.modules), 'same op, same result');

  const moved = first.modules.find((m) => m.id === 'm3');
  assert.equal(moved.wallId, 'a');
  assert.deepEqual(first.modules.map((m) => m.wallOffset), [0, 800, 1600], 'm3 packs after m2');
  assert.deepEqual(first.issues.filter((i) => i.severity === 'error'), []);
});

// --- 7. room resize regenerates -----------------------------------------
test('cp02 spec: resizing a wall rebuilds placement', () => {
  const base = buildProject(CP01);
  // Shorten wall-a below the run's packed length; a4 can no longer fit.
  const resized = updateWall(CP01, 'wall-a', { end: { x: 2400, y: 0 } }).derived;
  near(base.room.wall('wall-a').length, 2500);
  near(resized.room.wall('wall-a').length, 2400);

  const codes = resized.issues.map((i) => i.code);
  assert.ok(codes.includes('CANNOT_PLACE'), JSON.stringify(resized.issues));
  assert.notEqual(JSON.stringify(base.modules), JSON.stringify(resized.modules));

  // Lengthening instead just adds a gap and stays error-free on the run.
  const longer = updateWall(CP01, 'wall-a', { end: { x: 2800, y: 0 } }).derived;
  near(longer.room.wall('wall-a').length, 2800);
  const occ = longer.occupancy.find((o) => o.wallId === 'wall-a');
  near(occ.usable, 2800 - occ.atStart - occ.atEnd, TOL, 'usable length is derived');
});

// --- 8. module resize regenerates ---------------------------------------
test('cp02 spec: resizing a module shifts dependent placement', () => {
  const before = buildProject(CP01);
  const after = updateModule(CP01, 'a2', { width: 500 }).derived;
  const off = (b, id) => b.modules.find((m) => m.id === id).wallOffset;
  near(off(before, 'a3'), 1200);
  near(off(after, 'a3'), 1100, TOL, 'a3 follows the resized a2');
  near(off(after, 'a4'), 1700);
});

// --- placement API: place / remove / reorder + invalid ops --------------
test('cp02 spec: place, reorder and remove are deterministic and validated', () => {
  const placed = placeModule(CP01, cab('x1', 500), { wallId: 'wall-b' }).derived;
  assert.ok(placed.modules.some((m) => m.id === 'x1'));

  // reorder within wall-a: move a3 before a2
  const reordered = reorderModule(CP01, 'a3', 1).derived;
  const orderA = reordered.runs.find((r) => r.wallId === 'wall-a').moduleIds;
  assert.deepEqual(orderA, ['a1', 'a3', 'a2', 'a4']);

  const removed = removeModule(CP01, 'a1').derived;
  assert.ok(!removed.modules.some((m) => m.id === 'a1'));

  // invalid operations throw clearly
  assert.throws(() => placeModule(CP01, cab('y', 500), { wallId: 'nope' }), /invalid wall reference/);
  assert.throws(() => moveModule(CP01, 'ghost', { wallId: 'wall-a' }), /no module/);
  assert.throws(() => reorderModule(CP01, 'a1', 99), /out of range/);
});

// --- canonical equivalence of the two definition styles -----------------
test('cp02 spec: runs(moduleIds) and module.wallId definitions agree', () => {
  const fromWalls = buildProject(CP01);
  const runsDef = {
    id: 'same',
    room: CP01.room,
    sheet: CP01.sheet,
    runs: [
      { wallId: 'wall-a', startPoint: 'start', moduleIds: ['a1', 'a2', 'a3', 'a4'] },
      { wallId: 'wall-b', startPoint: 'start', moduleIds: ['b1', 'b2'] },
    ],
    modules: CP01.modules.map(({ wallId, autoOffset, ...dims }) => dims),
  };
  const fromRuns = buildProject(runsDef);
  assert.equal(JSON.stringify(fromRuns.modules), JSON.stringify(fromWalls.modules));
});

// --- normalization structural validation --------------------------------
test('cp02 spec: structural run errors are rejected', () => {
  assert.throws(
    () => normalizeProject({ id: 'x', room: rect(1000, 1000), modules: [cab('m', 100)], runs: [{ wallId: 'a', moduleIds: ['other'] }] }),
    /unknown module/,
  );
  assert.throws(
    () => normalizeProject({ id: 'x', room: rect(1000, 1000), modules: [cab('m', 100)], runs: [{ wallId: 'zz', moduleIds: ['m'] }] }),
    /unknown wall/,
  );
});
