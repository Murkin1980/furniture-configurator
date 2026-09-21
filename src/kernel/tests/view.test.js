/**
 * The view layer is derived output, not a second source of truth.
 * These tests assert that the drawings move when the canonical model moves,
 * and that the 3D wireframe is built from part.box.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, updateModule } from '../model/project.js';
import { planSvg } from '../view/planSvg.js';
import { isoSvg, isoProject } from '../view/isoSvg.js';

const FIXTURE = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

test('the plan view draws the calculated corner and wall lengths', () => {
  const svg = planSvg(buildProject(FIXTURE));
  assert.match(svg, /^<svg /);
  assert.match(svg, /wall-a 2500/, 'wall length comes from the kernel');
  assert.match(svg, /wall-b 1500/);
  assert.match(svg, /90° · a4/, 'the corner angle and its owner are drawn');
  // One rectangle per module.
  assert.equal((svg.match(/<polygon class="m/g) ?? []).length, 6);
});

test('the plan view follows a width change', () => {
  const before = planSvg(buildProject(FIXTURE));
  const { derived } = updateModule(FIXTURE, 'a3', { width: 500 });
  const after = planSvg(derived);
  assert.notEqual(before, after, 'the drawing must change');
  assert.match(after, />a3<tspan class="dim" x="[\d.]+" dy="28">500</);
});

test('the isometric view emits one box per part', () => {
  const bundle = buildProject(FIXTURE);
  const svg = isoSvg(bundle);
  // 12 wireframe edges per part, 30 parts.
  assert.equal((svg.match(/<line /g) ?? []).length, bundle.parts.length * 12 + bundle.room.walls.length);
  assert.equal((svg.match(/<polygon /g) ?? []).length, bundle.parts.length);
});

/** Collect every coordinate pair the SVG actually draws. */
function drawnPoints(svg) {
  const points = new Set();
  for (const list of svg.matchAll(/points="([^"]+)"/g)) {
    for (const pair of list[1].trim().split(/\s+/)) points.add(pair);
  }
  for (const line of svg.matchAll(/x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g)) {
    points.add(`${line[1]},${line[2]}`);
    points.add(`${line[3]},${line[4]}`);
  }
  return points;
}

test('the isometric view is built from part.box, not from private numbers', () => {
  const bundle = buildProject(FIXTURE);
  const { derived } = updateModule(FIXTURE, 'a1', { width: 900 });

  const before = isoSvg(bundle);
  const after = isoSvg(derived);
  assert.notEqual(before, after, 'a width change must move the 3D drawing');

  // Prove the projected geometry really is the part box: take the facade of
  // a1, project its corners independently and require every one of them in
  // the drawing.
  const facade = derived.parts.find((p) => p.moduleId === 'a1' && p.role === 'facade');
  assert.ok(facade.box);
  const wall = derived.room.wall('wall-a');
  const drawn = drawnPoints(after);
  const bz = derived.modules.find((m) => m.id === 'a1').bottomZ ?? 0; // CP-12 derived elevation

  const expected = [];
  for (const x of [facade.box.min.x, facade.box.max.x]) {
    for (const y of [facade.box.min.y, facade.box.max.y]) {
      for (const z of [facade.box.min.z, facade.box.max.z]) {
        // Wall A runs along +X from the origin with its inward normal at +Y.
        const p = isoProject(wall.start.x + x, wall.start.y + y, z + bz);
        expected.push(`${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`);
      }
    }
  }
  for (const point of expected) {
    assert.ok(drawn.has(point), `expected projected facade corner ${point} in the SVG`);
  }
  assert.ok(expected.includes('294.45,-90'), 'sanity: the 900 mm wide facade top corner is drawn');
});

test('isoProject is a real isometric projection', () => {
  // Equal steps along X and Y move the projected point symmetrically.
  const a = isoProject(1000, 0, 0);
  const b = isoProject(0, 1000, 0);
  assert.ok(Math.abs(a.x + b.x) < 1e-9, 'x and y are mirror images on screen');
  assert.ok(Math.abs(a.y - b.y) < 1e-9);
  // Height only moves the point up.
  const c = isoProject(0, 0, 720);
  assert.ok(Math.abs(c.x) < 1e-9);
  assert.ok(c.y < 0, '+Z is drawn upwards');
});
