/**
 * CP-07 - pointer drop -> placement action.
 *
 * nearestWall() projects world points onto walls; dropAction() converts a drop
 * into a {move, wallId, index} action using derived offsets. The preview's
 * pointer layer only calls these; it owns no placement logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, nearestWall, dropAction, applyAction } from '../index.js';

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);
const room = buildProject(CP01).room;

test('cp07: nearestWall projects onto the closest wall', () => {
  const a = nearestWall(room, { x: 1250, y: 150 });
  assert.equal(a.wallId, 'wall-a');
  assert.ok(Math.abs(a.offset - 1250) < 1e-9);

  const b = nearestWall(room, { x: 2350, y: 800 });
  assert.equal(b.wallId, 'wall-b');
  assert.ok(Math.abs(b.offset - 800) < 1e-9);

  // clamped to the segment ends
  const clamp = nearestWall(room, { x: -500, y: -200 });
  assert.equal(clamp.wallId, 'wall-a');
  assert.equal(clamp.offset, 0);
});

test('cp07: drop on another wall becomes a move with insertion index', () => {
  const action = dropAction(CP01, 'b1', { x: 1000, y: 100 });
  assert.deepEqual(action, { type: 'move', moduleId: 'b1', wallId: 'wall-a', index: 2 });

  const next = applyAction(CP01, action);
  assert.deepEqual(
    next.runs.find((r) => r.wallId === 'wall-a').moduleIds,
    ['a1', 'a2', 'b1', 'a3', 'a4'],
  );
});

test('cp07: drop on the same wall is a reorder', () => {
  const action = dropAction(CP01, 'a4', { x: 300, y: 50 });
  assert.equal(action.wallId, 'wall-a');
  assert.equal(action.index, 1);
  const next = applyAction(CP01, action);
  assert.deepEqual(
    next.runs.find((r) => r.wallId === 'wall-a').moduleIds,
    ['a1', 'a4', 'a2', 'a3'],
  );
});

test('cp07: drop is deterministic and validated', () => {
  const p = { x: 900, y: 120 };
  assert.equal(JSON.stringify(dropAction(CP01, 'b2', p)), JSON.stringify(dropAction(CP01, 'b2', p)));
  assert.throws(() => dropAction(CP01, 'ghost', p), /no module/);
});
