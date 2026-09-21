/**
 * CP-09 - undo/redo + persistence as action-log replay.
 *
 * The journal is the document: current() always replays base + actions through
 * applyActions(), so undo/redo/persistence are pure journal operations and the
 * derived model is never stored.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildProject,
  createHistory,
  pushAction,
  applyAndRecord,
  current,
  undo,
  redo,
  serializeHistory,
  deserializeHistory,
} from '../index.js';

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

const modulesJson = (def) => JSON.stringify(buildProject(def).modules);

test('cp09: undo restores base, redo re-applies', () => {
  let h = createHistory(CP01);
  h = pushAction(h, { type: 'resize', moduleId: 'a2', width: 500 });
  assert.notEqual(modulesJson(current(h)), modulesJson(CP01));
  const undone = undo(h);
  assert.equal(modulesJson(current(undone)), modulesJson(CP01));
  const redone = redo(undone);
  assert.equal(modulesJson(current(redone)), modulesJson(current(h)));
});

test('cp09: a new action clears the redo stack', () => {
  let h = createHistory(CP01);
  h = pushAction(h, { type: 'resize', moduleId: 'a2', width: 500 });
  h = undo(h);
  assert.equal(h.redo.length, 1);
  h = pushAction(h, { type: 'resize', moduleId: 'a3', width: 400 });
  assert.equal(h.redo.length, 0);
});

test('cp09: undo/redo on empty stacks throw', () => {
  const h = createHistory(CP01);
  assert.throws(() => undo(h), /nothing to undo/);
  assert.throws(() => redo(h), /nothing to redo/);
});

test('cp09: moveCorner is an action (replayable)', () => {
  let h = createHistory(CP01);
  h = pushAction(h, { type: 'moveCorner', cornerIndex: 0, point: { x: 2600, y: 400 }, snap90: true });
  const room = buildProject(current(h)).room;
  assert.ok(Math.abs(room.corners[0].turnDeg - 90) <= 1e-6);
});

test('cp09: serialize/deserialize round-trips the whole project', () => {
  let h = createHistory(CP01);
  h = pushAction(h, { type: 'resize', moduleId: 'a2', width: 500 });
  h = pushAction(h, { type: 'reorder', moduleId: 'a3', index: 1 });
  const back = deserializeHistory(serializeHistory(h));
  assert.equal(JSON.stringify(current(back)), JSON.stringify(current(h)));
  assert.throws(() => deserializeHistory('{"nope":1}'), /not a serialized history/);
});

test('cp09: applyAndRecord validates before recording', () => {
  const h = createHistory(CP01);
  assert.throws(() => applyAndRecord(h, { type: 'resize', moduleId: 'ghost', width: 1 }), /no module/);
  assert.equal(h.actions.length, 0, 'invalid action not recorded');
});
