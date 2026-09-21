/**
 * CP-10 - opening edits (slide/resize/add/remove doors & windows).
 *
 * Openings stay wall-relative; edits only rewrite offset/width with clamping.
 * Placement keeps routing around them automatically - moving the door makes
 * the run re-pack, proving avoidance reacts to opening edits.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildProject,
  applyAction,
  moveOpening,
  resizeOpening,
  addOpening,
  removeOpening,
} from '../index.js';

const MULTI = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-multirun/project.json', import.meta.url), 'utf8'),
);

const offsetsA = (def) =>
  buildProject(def).modules.filter((m) => m.wallId === 'wall-a').map((m) => m.wallOffset);

test('cp10: baseline routes around the authored door', () => {
  assert.deepEqual(offsetsA(MULTI), [0, 600, 2000]);
});

test('cp10: sliding the door re-packs the run (automatic avoidance)', () => {
  const next = applyAction(MULTI, { type: 'moveOpening', openingId: 'door-1', offset: 0 });
  assert.equal(next.room.openings[0].offset, 0);
  assert.deepEqual(offsetsA(next), [800, 1400, 2000]);
});

test('cp10: move/resize clamp to the wall', () => {
  const lo = moveOpening(MULTI, 'door-1', -500);
  assert.equal(lo.room.openings[0].offset, 0);
  const hi = moveOpening(MULTI, 'door-1', 99999);
  assert.equal(hi.room.openings[0].offset, 3000 - 800);
  const wide = resizeOpening(MULTI, 'door-1', 5000);
  assert.equal(wide.room.openings[0].width, 3000);
  assert.equal(wide.room.openings[0].offset, 0);
});

test('cp10: removing the door lets the run close the gap', () => {
  const next = removeOpening(MULTI, 'door-1');
  assert.deepEqual(offsetsA(next), [0, 600, 1200]);
});

test('cp10: add/remove round trip and validation', () => {
  const added = addOpening(MULTI, { wallId: 'wall-c', kind: 'window', offset: 500, width: 900, sillHeight: 900, headHeight: 2100 });
  assert.ok(added.room.openings.some((o) => o.wallId === 'wall-c' && o.width === 900));
  const id = added.room.openings.find((o) => o.wallId === 'wall-c').id;
  const removed = removeOpening(added, id);
  assert.equal(removed.room.openings.length, MULTI.room.openings.length);

  assert.throws(() => moveOpening(MULTI, 'ghost', 10), /no opening/);
  assert.throws(() => addOpening(MULTI, { wallId: 'nope' }), /unknown wall/);
});

test('cp10: opening edits are deterministic', () => {
  const a = moveOpening(MULTI, 'door-1', 300);
  const b = moveOpening(MULTI, 'door-1', 300);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
