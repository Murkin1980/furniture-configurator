/**
 * CP-11 - ergonomics checklist as derived validation readouts.
 *
 * Every status is computed from the kernel bundle; rules the model cannot
 * express are 'na', never invented.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, checklist, applyAction } from '../index.js';

const load = (n) =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${n}/project.json`, import.meta.url), 'utf8'));
const CP01 = load('kitchen-2500x1500');

const item = (list, id) => list.find((i) => i.id === id);

test('cp11: CP-01 fixture passes the modelled rules', () => {
  const list = checklist(buildProject(CP01));
  assert.equal(item(list, 'fits-room').status, 'pass');
  assert.equal(item(list, 'no-gaps').status, 'pass');
  assert.equal(item(list, 'base-depth').status, 'pass');
  assert.equal(item(list, 'corner-facade').status, 'na'); // no declared corner cabinet
  assert.equal(item(list, 'top-depth').status, 'na');
  assert.equal(item(list, 'worktop-height').status, 'na');
});

test('cp11: declared corner cabinets are checked against 500', () => {
  const mk = (width) => ({
    room: { height: 2500 },
    issues: [],
    modules: [{ id: 'k1', type: 'base-cabinet', width, height: 720, depth: 560, parameters: { corner: true } }],
    corners: [{ occupancy: { moduleId: 'k1' } }],
  });
  assert.equal(item(checklist(mk(400)), 'corner-facade').status, 'fail');
  assert.ok(item(checklist(mk(400)), 'corner-facade').message.includes('k1=400'));
  assert.equal(item(checklist(mk(600)), 'corner-facade').status, 'pass');
});

test('cp11: shallow bottom cabinet fails base-depth', () => {
  const next = applyAction(CP01, { type: 'resize', moduleId: 'a2', depth: 350 });
  const d = item(checklist(buildProject(next)), 'base-depth');
  assert.equal(d.status, 'fail');
  assert.ok(d.message.includes('a2=350'));
});

test('cp11: a resized module that leaves a gap fails no-gaps', () => {
  const next = applyAction(CP01, { type: 'resize', moduleId: 'a3', width: 500 });
  const g = item(checklist(buildProject(next)), 'no-gaps');
  assert.equal(g.status, 'fail');
});

test('cp11: a module above the ceiling fails fits-room', () => {
  const straight = load('kitchen-straight');
  const next = applyAction(straight, { type: 'add', wallId: 'wall-a', module: { width: 600, height: 3000 } });
  const f = item(checklist(buildProject(next)), 'fits-room');
  assert.equal(f.status, 'fail');
});

test('cp11: checklist is deterministic', () => {
  const a = checklist(buildProject(CP01));
  const b = checklist(buildProject(CP01));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
