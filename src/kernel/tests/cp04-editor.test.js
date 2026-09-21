/**
 * CP-04 - editor actions dispatched through the placement API.
 *
 * Proves applyAction() is a faithful, deterministic UI-facing wrapper over the
 * CP-02 operations (and CP-01 update*): every edit rewrites only the canonical
 * model; coordinates always come back from buildProject().
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction, applyActions, nextModuleId, buildProject } from '../index.js';

const TOL = 1e-9;
const near = (a, e, msg = '') => assert.ok(Math.abs(a - e) <= TOL, `${msg} expected ~${e}, got ${a}`);

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), 'utf8'));

const CP01 = load('kitchen-2500x1500');
const STRAIGHT = load('kitchen-straight');

const offsets = (def, wallId) =>
  buildProject(def).modules.filter((m) => m.wallId === wallId).map((m) => m.wallOffset);
const offset = (def, id) => buildProject(def).modules.find((m) => m.id === id).wallOffset;

test('cp04: add appends to a run and derives its offset', () => {
  const next = applyAction(STRAIGHT, { type: 'add', wallId: 'wall-a', module: { width: 600 } });
  const id = nextModuleId(STRAIGHT);
  assert.ok(next.modules.some((m) => m.id === id));
  assert.deepEqual(offsets(next, 'wall-a'), [0, 800, 1600, 2400]);
  assert.deepEqual(buildProject(next).issues.filter((i) => i.severity === 'error'), []);
});

test('cp04: add on a full wall surfaces CANNOT_PLACE (no silent overflow)', () => {
  const next = applyAction(CP01, { type: 'add', wallId: 'wall-a', module: { width: 600 } });
  const codes = buildProject(next).issues.map((i) => i.code);
  assert.ok(codes.includes('CANNOT_PLACE'), JSON.stringify(codes));
});

test('cp04: resize shifts dependent modules', () => {
  const next = applyAction(CP01, { type: 'resize', moduleId: 'a2', width: 500 });
  near(offset(next, 'a3'), 1100, 'a3');
  near(offset(next, 'a4'), 1700, 'a4');
});

test('cp04: remove repacks the run', () => {
  const next = applyAction(CP01, { type: 'remove', moduleId: 'a1' });
  assert.ok(!next.modules.some((m) => m.id === 'a1'));
  near(offset(next, 'a2'), 0, 'a2 repacks to 0');
});

test('cp04: reorder within a run', () => {
  const next = applyAction(CP01, { type: 'reorder', moduleId: 'a3', index: 1 });
  assert.deepEqual(next.runs.find((r) => r.wallId === 'wall-a').moduleIds, ['a1', 'a3', 'a2', 'a4']);
  near(offset(next, 'a3'), 600, 'a3 now second');
});

test('cp04: move between runs and back is a round trip', () => {
  const def = {
    id: 'rt',
    room: STRAIGHT.room,
    runs: [
      { wallId: 'wall-a', startPoint: 'start', moduleIds: ['m1', 'm2'] },
      { wallId: 'wall-c', startPoint: 'start', moduleIds: ['m3'] },
    ],
    modules: [
      { id: 'm1', type: 'base-cabinet', width: 800, height: 720, depth: 560 },
      { id: 'm2', type: 'base-cabinet', width: 800, height: 720, depth: 560 },
      { id: 'm3', type: 'base-cabinet', width: 800, height: 720, depth: 560 },
    ],
  };
  const moved = applyAction(def, { type: 'move', moduleId: 'm3', wallId: 'wall-a' });
  assert.deepEqual(offsets(moved, 'wall-a'), [0, 800, 1600]);
  const back = applyAction(moved, { type: 'move', moduleId: 'm3', wallId: 'wall-c' });
  assert.equal(JSON.stringify(buildProject(back).modules), JSON.stringify(buildProject(def).modules));
});

test('cp04: resizeWall rebuilds runs', () => {
  const next = applyAction(CP01, { type: 'resizeWall', wallId: 'wall-a', patch: { end: { x: 2400, y: 0 } } });
  const codes = buildProject(next).issues.map((i) => i.code);
  assert.ok(codes.includes('CANNOT_PLACE'));
});

test('cp04: invalid actions throw descriptive errors', () => {
  assert.throws(() => applyAction(CP01, { type: 'resize', moduleId: 'ghost', width: 500 }), /no module/);
  assert.throws(() => applyAction(CP01, { type: 'move', moduleId: 'a1', wallId: 'nope' }), /invalid wall/);
  assert.throws(() => applyAction(CP01, { type: 'add', wallId: 'nope' }), /invalid wall/);
  assert.throws(() => applyAction(CP01, { type: 'reorder', moduleId: 'a1', index: 99 }), /out of range/);
  assert.throws(() => applyAction(CP01, { type: 'teleport' }), /unknown action/);
});

test('cp04: replaying the same action sequence is deterministic', () => {
  const seq = [
    { type: 'resize', moduleId: 'a2', width: 500 },
    { type: 'reorder', moduleId: 'a3', index: 1 },
    { type: 'add', wallId: 'wall-b', module: { width: 400 } },
  ];
  const a = applyActions(CP01, seq);
  const b = applyActions(CP01, seq);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
