/**
 * CP-13 - auto blind-corner cabinet: derived facade from the neighbouring run.
 *
 * The facade width is NEVER authored and NEVER a 560 constant; it is derived
 * from the adjacent run depth and flows through parts, BOM, 3D/GLB, checklist
 * and validation from one source.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildProject,
  checklist,
  sceneGraph,
  exportGlb,
  parseGlb,
  createHistory,
  applyAndRecord,
  current,
  undo,
  redo,
  serializeHistory,
  deserializeHistory,
} from '../index.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../../fixtures/${p}`, import.meta.url), 'utf8'));
const CORNER = read('kitchen-corner/project.json');
const clone = (d) => JSON.parse(JSON.stringify(d));
const mod = (b, id) => b.modules.find((m) => m.id === id);
const facadeOf = (b, id) => b.parts.find((p) => p.moduleId === id && p.role === 'facade');
const item = (list, id) => list.find((i) => i.id === id);
const CORNER_PARAM = { kind: 'blind', auto: true, clearance: 0 };

// 1. 90 deg blind corner: owner 1120, adjacent depth 560 -> facade 560.
test('cp13: derives facade = owner width - adjacent depth', () => {
  const b = buildProject(CORNER);
  const cd = mod(b, 'c1').cornerDerived;
  assert.equal(cd.cornerId, 'wall-a__wall-b');
  assert.equal(cd.adjacentWallId, 'wall-b');
  assert.equal(cd.blindSide, 'end');
  assert.equal(cd.adjacentDepth, 560);
  assert.equal(cd.facadeWidth, 560); // 1120 - 560, no constant involved
  assert.equal(facadeOf(b, 'c1').length, 560);
});

// 2. Change the adjacent depth to 600 -> facade 520 everywhere.
test('cp13: adjacent depth 600 makes the facade 520 in parts, BOM and checklist', () => {
  const d = clone(CORNER);
  d.modules[2].depth = 600; // b1
  const b = buildProject(d);
  assert.equal(mod(b, 'c1').cornerDerived.facadeWidth, 520);
  assert.equal(facadeOf(b, 'c1').length, 520);
  assert.ok(b.bom.some((l) => l.label === 'Фасад' && l.length === 520));
  assert.equal(item(checklist(b), 'corner-facade').status, 'pass');
});

// 3. Owner 1000 + adjacent 560 -> facade 440 and the checklist fails.
test('cp13: a 440 derived facade fails the 500 corner rule', () => {
  const d = clone(CORNER);
  d.modules[0].width = 1500; // a1, so c1 still closes the corner
  d.modules[1].width = 1000; // c1
  const b = buildProject(d);
  assert.equal(mod(b, 'c1').cornerDerived.facadeWidth, 440);
  const ci = item(checklist(b), 'corner-facade');
  assert.equal(ci.status, 'fail');
  assert.ok(ci.message.includes('c1=440'));
});

// 4. A non-corner base cabinet keeps its full-width facade.
test('cp13: non-corner cabinets are unchanged', () => {
  const b = buildProject(CORNER);
  assert.equal(mod(b, 'a1').cornerDerived, undefined);
  assert.equal(facadeOf(b, 'a1').length, 1380);
  assert.equal(facadeOf(b, 'a1').box.max.x - facadeOf(b, 'a1').box.min.x, 1380);
});

// 5. Auto corner with no adjacent run -> explicit validation issue.
test('cp13: missing adjacent run is CORNER_NEIGHBOR_MISSING', () => {
  const d = clone(CORNER);
  d.runs = d.runs.filter((r) => r.wallId !== 'wall-b');
  d.modules = d.modules.filter((m) => m.id !== 'b1');
  const b = buildProject(d);
  assert.equal(mod(b, 'c1').cornerDerived.error, 'CORNER_NEIGHBOR_MISSING');
  assert.ok(b.issues.some((i) => i.code === 'CORNER_NEIGHBOR_MISSING'));
});

// 6. Auto corner that does not touch a corner -> CORNER_OWNER_INVALID.
test('cp13: a corner cabinet away from the corner is CORNER_OWNER_INVALID', () => {
  const d = clone(CORNER);
  d.modules[1].width = 800; // c1 no longer reaches wall-a's end (gap to 2500)
  const b = buildProject(d);
  assert.equal(mod(b, 'c1').cornerDerived.error, 'CORNER_OWNER_INVALID');
  assert.ok(b.issues.some((i) => i.code === 'CORNER_OWNER_INVALID'));
});

// 7. Reversed direction: a corner cabinet at its wall's START -> blindSide 'start'.
test('cp13: reversed run direction derives blindSide start with the same facade', () => {
  // Corner cabinet cb pinned at wall-b's start (the corner); wall-a stands off.
  const def = {
    id: 'reversed', name: 'reversed', units: 'mm',
    room: CORNER.room,
    installation: CORNER.installation,
    runs: [
      { wallId: 'wall-b', startPoint: 'start', moduleIds: ['cb'] },
      { wallId: 'wall-a', startPoint: 'start', moduleIds: ['ar'] },
    ],
    modules: [
      { id: 'cb', type: 'base-cabinet', width: 1120, height: 720, depth: 560, parameters: { corner: CORNER_PARAM } },
      { id: 'ar', type: 'base-cabinet', width: 1940, height: 720, depth: 560 },
    ],
    sheet: CORNER.sheet,
  };
  const b = buildProject(def);
  const cd = mod(b, 'cb').cornerDerived;
  assert.equal(cd.blindSide, 'start');
  assert.equal(cd.adjacentWallId, 'wall-a');
  assert.equal(cd.facadeWidth, 560);
  // Facade sits on the accessible side: x from blindWidth(560) to 1120.
  const f = facadeOf(b, 'cb');
  assert.equal(f.length, 560);
  assert.equal(f.box.min.x, 560);
  assert.equal(f.box.max.x, 1120);
});

// 8. Two independent auto corners derive deterministically.
test('cp13: a two-corner layout derives both facades independently', () => {
  const def = {
    id: 'two-corner', name: 'two-corner', units: 'mm',
    room: {
      id: 'room-rect', height: 2500,
      walls: [
        { id: 'wall-a', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 }, thickness: 100 },
        { id: 'wall-b', start: { x: 3000, y: 0 }, end: { x: 3000, y: 2000 }, thickness: 100 },
        { id: 'wall-c', start: { x: 3000, y: 2000 }, end: { x: 0, y: 2000 }, thickness: 100 },
        { id: 'wall-d', start: { x: 0, y: 2000 }, end: { x: 0, y: 0 }, thickness: 100 },
      ],
      openings: [],
    },
    installation: CORNER.installation,
    runs: [
      { wallId: 'wall-a', startPoint: 'start', moduleIds: ['a1', 'ca'] },
      { wallId: 'wall-b', startPoint: 'start', moduleIds: ['bb'] },
      { wallId: 'wall-c', startPoint: 'start', moduleIds: ['c1m', 'cc'] },
      { wallId: 'wall-d', startPoint: 'start', moduleIds: ['dd'] },
    ],
    modules: [
      { id: 'a1', type: 'base-cabinet', width: 1880, height: 720, depth: 560 },
      { id: 'ca', type: 'base-cabinet', width: 1120, height: 720, depth: 560, parameters: { corner: CORNER_PARAM } },
      { id: 'bb', type: 'base-cabinet', width: 600, height: 720, depth: 560 },
      { id: 'c1m', type: 'base-cabinet', width: 1880, height: 720, depth: 560 },
      { id: 'cc', type: 'base-cabinet', width: 1120, height: 720, depth: 600, parameters: { corner: CORNER_PARAM } },
      { id: 'dd', type: 'base-cabinet', width: 600, height: 720, depth: 600 },
    ],
    sheet: CORNER.sheet,
  };
  const b = buildProject(def);
  assert.equal(mod(b, 'ca').cornerDerived.facadeWidth, 560); // 1120 - 560 (bb depth)
  assert.equal(mod(b, 'cc').cornerDerived.facadeWidth, 520); // 1120 - 600 (dd depth)
  assert.equal(mod(b, 'ca').cornerDerived.cornerId, 'wall-a__wall-b');
  assert.equal(mod(b, 'cc').cornerDerived.cornerId, 'wall-c__wall-d');
});

// 9. The BOM cut for the corner facade equals the derived width.
test('cp13: BOM carries the derived facade cut', () => {
  const b = buildProject(CORNER);
  const line = b.bom.find((l) => l.label === 'Фасад' && l.length === 560);
  assert.ok(line, 'a 560-wide facade line exists in the BOM');
  assert.ok(line.partIds.includes('c1__facade'));
});

// 10. The 3D scene and GLB use the same derived facade width.
test('cp13: scene + GLB facade geometry equals the derived width', () => {
  const b = buildProject(CORNER);
  const scene = sceneGraph(b);
  const c1 = scene.modules.find((m) => m.id === 'c1');
  const f = c1.parts.find((p) => p.role === 'facade');
  assert.equal(f.max.x - f.min.x, 560);
  const { json } = parseGlb(exportGlb(b));
  const node = json.nodes.find((n) => n.name === 'c1-facade' || n.name.startsWith('c1-facade'));
  assert.ok(node, 'a c1 facade node exists');
  assert.equal(Math.round(node.scale[0]), 560);
});

// 11. Resizing the neighbour depth re-derives facade, BOM and checklist.
test('cp13: resize neighbour depth propagates through one rebuild', () => {
  const before = buildProject(CORNER);
  assert.equal(mod(before, 'c1').cornerDerived.facadeWidth, 560);
  const next = applyAndRecord(createHistory(CORNER), { type: 'resize', moduleId: 'b1', depth: 650 });
  const after = buildProject(current(next));
  assert.equal(mod(after, 'c1').cornerDerived.facadeWidth, 470); // 1120 - 650
  assert.equal(facadeOf(after, 'c1').length, 470);
  assert.equal(item(checklist(after), 'corner-facade').status, 'fail'); // 470 < 500
});

// 12. Resizing the owner width re-derives the facade.
test('cp13: resize owner width propagates through one rebuild', () => {
  const d = clone(CORNER);
  d.modules[0].width = 1500; // keep c1 closing the corner
  const h = applyAndRecord(createHistory(d), { type: 'resize', moduleId: 'c1', width: 1000 });
  const b = buildProject(current(h));
  assert.equal(mod(b, 'c1').cornerDerived.facadeWidth, 440);
  assert.equal(facadeOf(b, 'c1').length, 440);
});

// 13. History/persistence store only canonical inputs and reproduce the state.
test('cp13: undo/redo/serialize keep no derived corner state', () => {
  const h0 = createHistory(CORNER);
  const h1 = applyAndRecord(h0, { type: 'resize', moduleId: 'b1', depth: 600 });
  const serialized = serializeHistory(h1);
  assert.ok(!serialized.includes('cornerDerived'));
  assert.ok(!serialized.includes('facadeWidth'));
  const replayed = buildProject(current(deserializeHistory(serialized)));
  assert.equal(mod(replayed, 'c1').cornerDerived.facadeWidth, 520);
  // undo restores 560, redo re-derives 520 - all recomputed, none stored.
  assert.equal(mod(buildProject(current(undo(h1))), 'c1').cornerDerived.facadeWidth, 560);
  assert.equal(mod(buildProject(current(redo(undo(h1)))), 'c1').cornerDerived.facadeWidth, 520);
});

// 14. Determinism.
test('cp13: repeated builds are deterministic', () => {
  const a = buildProject(CORNER);
  const b = buildProject(CORNER);
  assert.equal(JSON.stringify(a.modules.map((m) => m.cornerDerived)), JSON.stringify(b.modules.map((m) => m.cornerDerived)));
  assert.equal(Buffer.from(exportGlb(a)).toString('hex'), Buffer.from(exportGlb(b)).toString('hex'));
});
