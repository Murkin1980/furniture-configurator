/**
 * CP-01 sections 12 and 15: one parametric cabinet, and the proof that a
 * parameter change regenerates geometry, Parts and BOM.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { generateBaseCabinet, edgeBandingLength } from '../furniture/cabinet.js';
import { deriveBom, deriveParts, bomTotals } from '../bom/bom.js';

const near = (actual, expected, tol = 1e-9, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

const cab = (over = {}) => ({
  id: 'm1',
  type: 'base-cabinet',
  width: 600,
  height: 720,
  depth: 560,
  wallId: 'a',
  wallOffset: 0,
  ...over,
});

const byRole = (parts) => Object.fromEntries(parts.map((p) => [p.role, p]));

test('a base cabinet generates the five required parts', () => {
  const { parts } = generateBaseCabinet(cab());
  assert.deepEqual(parts.map((p) => p.role).sort(), [
    'bottom',
    'facade',
    'rail-top',
    'side-left',
    'side-right',
  ]);
  // Every part carries both a manufacturing cut size and a 3D box, so the
  // view and the BOM read the SAME numbers.
  for (const p of parts) {
    assert.ok(p.box, `${p.role} must expose a box for the view`);
    assert.ok(p.length > 0 && p.width > 0 && p.thickness > 0, `${p.role} needs positive cut sizes`);
  }
});

test('panel dimensions follow the carcass parameters', () => {
  const { parts } = generateBaseCabinet(cab({ width: 600, height: 720, depth: 560 }));
  const r = byRole(parts);

  // Sides: depth x height, 18 mm thick.
  near(r['side-left'].length, 560);
  near(r['side-left'].width, 720);
  near(r['side-left'].thickness, 18);
  near(r['side-right'].length, 560);

  // Bottom and rail sit between the two sides: width minus 2 x 18.
  near(r.bottom.length, 600 - 36);
  near(r.bottom.width, 560);
  near(r['rail-top'].length, 600 - 36);
  near(r['rail-top'].width, 100);

  // Facade covers the full carcass footprint.
  near(r.facade.length, 600);
  near(r.facade.width, 720);
});

test('the 3D boxes are consistent with the cut sizes', () => {
  const { parts } = generateBaseCabinet(cab({ width: 600, height: 720, depth: 560 }));
  const r = byRole(parts);
  const size = (box) => ({
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  });

  const side = size(r['side-left'].box);
  near(side.x, 18, 1e-9, 'side box thickness');
  near(side.y, 560, 1e-9, 'side box depth == part length');
  near(side.z, 720, 1e-9, 'side box height == part width');

  const bottom = size(r.bottom.box);
  near(bottom.x, 564, 1e-9, 'bottom spans between the sides');
  near(bottom.y, 560);
  near(bottom.z, 18);

  const facade = size(r.facade.box);
  near(facade.x, 600);
  near(facade.z, 720);
  near(r.facade.box.min.y, 560, 1e-9, 'facade hangs in front of the carcass');
});

test('changing the width regenerates the dependent panels', () => {
  const before = byRole(generateBaseCabinet(cab({ width: 600 })).parts);
  const after = byRole(generateBaseCabinet(cab({ width: 500 })).parts);

  // Width-dependent parts must change...
  near(after.bottom.length, 500 - 36);
  near(after['rail-top'].length, 500 - 36);
  near(after.facade.length, 500);
  // ...and the change must actually differ from the previous values.
  assert.notEqual(after.bottom.length, before.bottom.length);
  assert.notEqual(after.facade.length, before.facade.length);

  // Width-independent parts must NOT change.
  near(after['side-left'].length, before['side-left'].length);
  near(after['side-left'].width, before['side-left'].width);
  near(after.bottom.width, before.bottom.width);
});

test('changing the depth and panel thickness regenerates the parts', () => {
  const base = byRole(generateBaseCabinet(cab()).parts);
  const deeper = byRole(generateBaseCabinet(cab({ depth: 600 })).parts);
  near(deeper['side-left'].length, 600);
  near(deeper.bottom.width, 600);
  assert.notEqual(deeper['side-left'].length, base['side-left'].length);

  const thicker = byRole(generateBaseCabinet(cab({ parameters: { panelThickness: 16 } })).parts);
  near(thicker['side-left'].thickness, 16);
  near(thicker.bottom.length, 600 - 32, 1e-9, 'a thinner side gives a wider bottom');
  near(thicker['side-left'].box.max.x, 16);
});

test('invalid parameters fail loudly instead of producing bad geometry', () => {
  assert.throws(() => generateBaseCabinet(cab({ width: 20 })), /too small/);
  assert.throws(
    () => generateBaseCabinet(cab({ height: 0 })),
    /non-positive dimensions/,
  );
  assert.throws(
    () => generateBaseCabinet({ ...cab(), type: 'wardrobe-section' }),
    /unsupported module type/,
  );
});

test('edge banding is derived per part', () => {
  const { parts } = generateBaseCabinet(cab({ width: 600, height: 720, depth: 560 }));
  const r = byRole(parts);
  // Side: one banded long edge (the front), 560 mm.
  near(edgeBandingLength(r['side-left']), 560);
  // Rail: enclosed, no banding.
  near(edgeBandingLength(r['rail-top']), 0);
  // Facade: all four sides.
  near(edgeBandingLength(r.facade), 2 * (600 + 720));
});

test('Parts regenerate from the module list only', () => {
  const modules = [cab({ id: 'm1', width: 600 }), cab({ id: 'm2', width: 400 })];
  const parts = deriveParts(modules);
  assert.equal(parts.length, 10, '5 parts per cabinet');
  assert.ok(parts.every((p) => p.moduleId === 'm1' || p.moduleId === 'm2'));
});

test('BOM aggregates identical cuts and tracks quantity', () => {
  const modules = [cab({ id: 'm1', width: 600 }), cab({ id: 'm2', width: 600 })];
  const bom = deriveBom(deriveParts(modules));

  const sides = bom.find((l) => l.roles.includes('side-left'));
  assert.ok(sides, 'a side line must exist');
  assert.equal(sides.count, 4, '2 cabinets x 2 identical sides');
  assert.equal(sides.length, 560);
  assert.equal(sides.width, 720);

  const totals = bomTotals(bom);
  assert.equal(totals.panels, 10);
  assert.ok(totals.areaM2 > 0);
  assert.ok(totals.bandingM > 0);
});

test('BOM changes when a module width changes, and only where it should', () => {
  const before = deriveBom(deriveParts([cab({ id: 'm1', width: 600 })]));
  const after = deriveBom(deriveParts([cab({ id: 'm1', width: 500 })]));

  const keyOf = (lines) => lines.map((l) => `${l.length}x${l.width}`).sort().join(',');
  assert.notEqual(keyOf(before), keyOf(after), 'the cut list must change');

  // Side panels do not depend on the cabinet width, so their line survives.
  const sideKey = (lines) => lines.find((l) => l.roles.includes('side-left'));
  assert.equal(sideKey(before).count, sideKey(after).count);
  assert.equal(sideKey(before).length, sideKey(after).length);

  // The facade line must move to the new width.
  const facade = (lines) => lines.find((l) => l.roles.includes('facade'));
  assert.equal(facade(after).length, 500);
});

test('BOM keys keep cut orientation apart because grain matters', () => {
  // A 720x560 and a 560x720 panel are NOT the same cut for grained board.
  const mk = (id, length, width, grain) => ({
    id,
    moduleId: 'm',
    role: id,
    name: id,
    length,
    width,
    thickness: 18,
    material: 'ldsp',
    grain,
    edges: { alongLengthStart: false, alongLengthEnd: false, alongWidthStart: false, alongWidthEnd: false },
    box: null,
  });

  const grained = deriveBom([mk('p1', 720, 560, 'length'), mk('p2', 560, 720, 'length')]);
  assert.equal(grained.length, 2, 'rotated grained panels stay separate');

  const identical = deriveBom([mk('p1', 720, 560, 'length'), mk('p2', 720, 560, 'length')]);
  assert.equal(identical.length, 1, 'identical cuts merge');
  assert.equal(identical[0].count, 2);

  // Edge banding also separates otherwise identical cuts.
  const banded = { ...mk('p2', 720, 560, 'length'), edges: { ...mk('p2', 720, 560, 'length').edges, alongLengthEnd: true } };
  assert.equal(deriveBom([mk('p1', 720, 560, 'length'), banded]).length, 2, 'banding is part of the cut');
});
