/**
 * CP-12 - Kitchen vertical system: base / wall / tall, one derived elevation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildProject,
  buildRoom,
  MODULE_GENERATORS,
  DEFAULT_INSTALLATION,
  installationValid,
  normalizeInstallation,
  moduleElevation,
  worktopTopZ,
  validateProject,
  checklist,
  sceneGraph,
  exportGlb,
  parseGlb,
  isoSvg,
  createHistory,
  applyAndRecord,
  current,
  undo,
  redo,
  serializeHistory,
  deserializeHistory,
} from '../index.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../../fixtures/${p}`, import.meta.url), 'utf8'));
const VERT = read('kitchen-vertical/project.json');
const CP01 = read('kitchen-2500x1500/project.json');
const clone = (d) => JSON.parse(JSON.stringify(d));

// 1. Three module types generate through the same registry.
test('cp12: base/wall/tall all come from one MODULE_GENERATORS registry', () => {
  const types = Object.keys(MODULE_GENERATORS).sort();
  assert.deepEqual(types, ['base-cabinet', 'tall-cabinet', 'wall-cabinet']);
  const bundle = buildProject(VERT);
  const byType = new Set(bundle.modules.map((m) => m.type));
  assert.ok(['base-cabinet', 'wall-cabinet', 'tall-cabinet'].every((t) => byType.has(t)));
  for (const m of bundle.modules) {
    const parts = bundle.parts.filter((p) => p.moduleId === m.id);
    assert.ok(parts.length > 0, `${m.id} produced parts`);
    assert.ok(parts.every((p) => p.box), `${m.id} parts have a box`);
  }
});

// 2. The renderer / export own no independent vertical formula.
test('cp12: view + export read derived bottomZ, they do not re-derive elevation', () => {
  const src = (f) => readFileSync(new URL(`../view/${f}`, import.meta.url), 'utf8');
  for (const f of ['scene3d.js', 'isoSvg.js', 'glb.js', 'cuttingPdf.js']) {
    const s = src(f);
    assert.ok(!/plinthHeight|worktopThickness/.test(s), `${f} must not recompute the elevation`);
  }
  assert.ok(/bottomZ/.test(src('scene3d.js')), 'scene3d reads bottomZ');
  assert.ok(/bottomZ/.test(src('isoSvg.js')), 'isoSvg reads bottomZ');
});

// 3. One deterministic worktop elevation from plinth + base + worktop.
test('cp12: worktop elevation is derived once and deterministic', () => {
  const a = buildProject(VERT);
  const b = buildProject(VERT);
  assert.equal(a.worktops.length, 1);
  assert.equal(a.worktops[0].topZ, 100 + 720 + 38); // 858
  assert.deepEqual(a.worktops, b.worktops);
  // Same formula through the helper.
  assert.equal(worktopTopZ({ plinthHeight: 100, worktopThickness: 38 }, { height: 720 }), 858);
});

// 4. CP-11 worktop-height is no longer always na.
test('cp12: worktop-height is a real pass/fail now (was always na)', () => {
  const list = checklist(buildProject(CP01));
  const item = list.find((i) => i.id === 'worktop-height');
  assert.equal(item.status, 'pass'); // 100+720+38 = 858 in 850..920
  // And it can fail: raise the base so the worktop leaves the band.
  const high = clone(VERT);
  high.modules[0].height = 900;
  high.modules[1].height = 900;
  const failItem = checklist(buildProject(high)).find((i) => i.id === 'worktop-height');
  assert.equal(failItem.status, 'fail'); // 100+900+38 = 1038 > 920
});

// 5. top-depth is exercised by the real wall-cabinet generator.
test('cp12: top-depth is measured from a real wall cabinet, not na', () => {
  const list = checklist(buildProject(VERT));
  const item = list.find((i) => i.id === 'top-depth');
  assert.equal(item.status, 'pass'); // wall cabinets are 350 deep (300..400)
});

// 6. Invalid vertical arrangements produce explicit validation issues.
test('cp12: wall cabinet without a mount height is flagged', () => {
  const d = clone(VERT);
  delete d.modules[3].parameters.mountHeight;
  const issues = buildProject(d).issues.map((i) => i.code);
  assert.ok(issues.includes('WALL_CABINET_NO_ANCHOR'));
});

test('cp12: a module above the room ceiling is flagged', () => {
  const d = clone(VERT);
  d.modules[3].parameters.mountHeight = 2000; // 2000 + 720 > room height 2500
  const issues = buildProject(d).issues.map((i) => i.code);
  assert.ok(issues.includes('MODULE_ABOVE_ROOM'));
});

test('cp12: an unlevel base run is flagged and blocks the worktop', () => {
  const d = clone(VERT);
  d.modules[1].height = 800; // run [v1=720, v2=800] on wall-a
  const bundle = buildProject(d);
  assert.ok(bundle.issues.some((i) => i.code === 'WORKTOP_UNLEVEL'));
  assert.equal(bundle.worktops[0].level, false);
  assert.equal(bundle.worktops[0].topZ, null);
});

test('cp12: an invalid installation is rejected with VERTICAL_PARAM_INVALID', () => {
  assert.equal(installationValid({ plinthHeight: -5, worktopThickness: 38 }), false);
  assert.equal(installationValid(normalizeInstallation({})), true); // defaults are valid
  const d = clone(VERT);
  d.installation = { plinthHeight: -5, worktopThickness: 38 };
  const issues = buildProject(d).issues.map((i) => i.code);
  assert.ok(issues.includes('VERTICAL_PARAM_INVALID'));
});

// 7. BOM is derived from the generator parts, including wall + tall cabinets.
test('cp12: BOM parts all belong to generated modules (incl. wall + tall)', () => {
  const bundle = buildProject(VERT);
  assert.ok(bundle.parts.length > 0);
  const ids = new Set(bundle.modules.map((m) => m.id));
  assert.ok(bundle.parts.every((p) => ids.has(p.moduleId)));
  // Wall and tall cabinets really produced parts that reached the BOM.
  assert.ok(bundle.parts.some((p) => p.moduleId === 'w1'), 'wall cabinet produced parts');
  assert.ok(bundle.parts.some((p) => p.moduleId === 't1'), 'tall cabinet produced parts');
  const bomPartIds = new Set(bundle.bom.flatMap((line) => line.partIds));
  assert.ok(bundle.parts.some((p) => p.moduleId === 'w1' && bomPartIds.has(p.id)));
  assert.ok(bundle.parts.some((p) => p.moduleId === 't1' && bomPartIds.has(p.id)));
  assert.ok(bundle.bom.length > 0);
});

// 8. Undo / redo / persistence preserve the new model.
test('cp12: installation survives history and persistence round-trips', () => {
  const before = buildProject(VERT);
  const h0 = createHistory(VERT);
  const h1 = applyAndRecord(h0, { type: 'resize', moduleId: 'v1', width: 650 });
  assert.equal(buildProject(current(h1)).modules.find((m) => m.id === 'v1').width, 650);

  const undone = buildProject(current(undo(h1)));
  assert.deepEqual(undone.installation, before.installation);
  assert.equal(undone.modules.find((m) => m.id === 'v1').width, 600);

  const redone = buildProject(current(redo(undo(h1))));
  assert.deepEqual(redone.installation, before.installation);
  assert.equal(redone.modules.find((m) => m.id === 'v1').width, 650);

  // Persistence: the journal is the whole document; replay keeps the model.
  const rt = buildProject(current(deserializeHistory(serializeHistory(h1))));
  assert.deepEqual(rt.installation, before.installation);
  assert.equal(rt.worktops[0].topZ, 858);
});

// 9. Base + tall sit on the plinth; a wall cabinet sits at its mount height.
test('cp12: elevation follows the module type', () => {
  const bundle = buildProject(VERT);
  const by = Object.fromEntries(bundle.modules.map((m) => [m.id, m]));
  assert.equal(by.v1.bottomZ, 100); // base on plinth
  assert.equal(by.v1.topZ, 820); // 100 + 720
  assert.equal(by.t1.bottomZ, 100); // tall on plinth
  assert.equal(by.t1.topZ, 2200); // 100 + 2100
  assert.equal(by.w1.bottomZ, 1400); // wall at its mount
  assert.equal(by.w1.topZ, 2120); // 1400 + 720
});

// 10. moduleElevation returns null for a wall cabinet with no anchor.
test('cp12: moduleElevation is null when a wall cabinet has no anchor', () => {
  const inst = { plinthHeight: 100, worktopThickness: 38 };
  assert.equal(moduleElevation(inst, { type: 'wall-cabinet', height: 720, parameters: {} }), null);
  assert.equal(moduleElevation(inst, { type: 'base-cabinet', height: 720 }).bottomZ, 100);
});

// 11. Defaults come from one kernel place when the project omits installation.
test('cp12: missing installation falls back to the kernel defaults', () => {
  const d = clone(VERT);
  delete d.installation;
  const bundle = buildProject(d);
  assert.deepEqual(bundle.installation, DEFAULT_INSTALLATION);
  assert.equal(bundle.worktops[0].topZ, 100 + 720 + 38);
});

// 12. The 3D scene reflects the derived elevation.
test('cp12: the scene places parts at the derived bottomZ', () => {
  const scene = sceneGraph(buildProject(VERT));
  const w1 = scene.modules.find((m) => m.id === 'w1');
  assert.equal(w1.basis.origin.z, 1400);
  const v1 = scene.modules.find((m) => m.id === 'v1');
  assert.equal(v1.basis.origin.z, 100);
  // Every wall-cabinet part corner is at or above the mount height.
  for (const p of w1.parts) for (const c of p.corners) assert.ok(c.z >= 1400 - 1e-9);
});

// 13. GLB nodes carry the derived elevation too.
test('cp12: GLB node translation includes the derived bottomZ', () => {
  const bundle = buildProject(VERT);
  const { json } = parseGlb(exportGlb(bundle));
  const node = json.nodes.find((n) => n.name.startsWith('w1-'));
  assert.ok(node, 'a wall-cabinet node exists');
  assert.ok(node.translation[2] >= 1400, 'wall part sits at the mount height');
});

// 14. Evidence views are deterministic for the vertical fixture.
test('cp12: iso + glb are deterministic for the vertical fixture', () => {
  const b1 = buildProject(VERT);
  const b2 = buildProject(VERT);
  assert.equal(isoSvg(b1), isoSvg(b2));
  assert.equal(
    Buffer.from(exportGlb(b1)).toString('hex'),
    Buffer.from(exportGlb(b2)).toString('hex'),
  );
});

// 15. Base cabinet honours custom plinth/worktop values (not just defaults).
test('cp12: custom plinth + worktop thickness drive the elevation', () => {
  const d = clone(VERT);
  d.installation = { plinthHeight: 120, worktopThickness: 40 };
  const bundle = buildProject(d);
  assert.deepEqual(bundle.installation, { plinthHeight: 120, worktopThickness: 40 });
  const v1 = bundle.modules.find((m) => m.id === 'v1');
  assert.equal(v1.bottomZ, 120); // base rides the custom plinth
  assert.equal(bundle.worktops[0].topZ, 120 + 720 + 40); // 880, inside 850..920
  assert.equal(
    checklist(bundle).find((i) => i.id === 'worktop-height').status,
    'pass',
  );
});

// 16. A wall cabinet outside 300..400 depth fails the top-depth rule.
test('cp12: wall cabinet depth outside 300..400 fails top-depth', () => {
  const d = clone(VERT);
  d.modules[3].depth = 250; // w1
  d.modules[4].depth = 250; // w2
  const item = checklist(buildProject(d)).find((i) => i.id === 'top-depth');
  assert.equal(item.status, 'fail');
});
