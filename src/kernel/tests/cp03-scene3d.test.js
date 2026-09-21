/**
 * CP-03 - derived 3D scene data.
 *
 * Proves sceneGraph() is a faithful, deterministic projection of the kernel
 * bundle: same part boxes as the BOM, footprints consistent with the plan view,
 * corner modules non-intersecting in 3D, everything inside the room envelope.
 * No renderer is involved - this module is pure data (Three.js consumes it in
 * kernel-3d.html).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, sceneGraph, moduleFootprint } from '../index.js';

const TOL = 1e-6;

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

const envelopeOf = (scene, bundle, id) => {
  const m = scene.modules.find((s) => s.id === id);
  const src = bundle.modules.find((b) => b.id === id);
  const b = m.basis;
  const corner = (x, y, z) => ({
    x: b.origin.x + x * b.x.x + y * b.y.x,
    y: b.origin.y + x * b.x.y + y * b.y.y,
    z,
  });
  return [
    corner(0, 0, 0),
    corner(src.width, 0, 0),
    corner(src.width, src.depth, 0),
    corner(0, src.depth, 0),
    corner(0, 0, src.height),
    corner(src.width, 0, src.height),
    corner(src.width, src.depth, src.height),
    corner(0, src.depth, src.height),
  ];
};

const aabb = (corners) => ({
  minX: Math.min(...corners.map((c) => c.x)),
  maxX: Math.max(...corners.map((c) => c.x)),
  minY: Math.min(...corners.map((c) => c.y)),
  maxY: Math.max(...corners.map((c) => c.y)),
  minZ: Math.min(...corners.map((c) => c.z)),
  maxZ: Math.max(...corners.map((c) => c.z)),
});

const interiorsIntersect = (a, b) =>
  a.minX < b.maxX - TOL && b.minX < a.maxX - TOL &&
  a.minY < b.maxY - TOL && b.minY < a.maxY - TOL &&
  a.minZ < b.maxZ - TOL && b.minZ < a.maxZ - TOL;

test('cp03: scene graph carries one renderable box per BOM part', () => {
  const bundle = buildProject(CP01);
  const scene = sceneGraph(bundle);
  const boxed = bundle.parts.filter((p) => p.box);
  assert.equal(scene.partCount, boxed.length);
  const sceneParts = scene.modules.flatMap((m) => m.parts);
  assert.equal(sceneParts.length, boxed.length);
  for (const p of sceneParts) assert.equal(p.corners.length, 8);
});

test('cp03: module envelope XY matches the plan-view footprint', () => {
  const bundle = buildProject(CP01);
  const scene = sceneGraph(bundle);
  for (const m of bundle.modules) {
    const fp = moduleFootprint(bundle.room, m);
    const env = envelopeOf(scene, bundle, m.id);
    // footprint order: (0,0),(W,0),(W,D),(0,D) -> envelope indices 0,1,2,3
    for (let i = 0; i < 4; i++) {
      assert.ok(Math.abs(env[i].x - fp[i].x) <= TOL, `${m.id} x${i}`);
      assert.ok(Math.abs(env[i].y - fp[i].y) <= TOL, `${m.id} y${i}`);
    }
  }
});

test('cp03: corner modules do not intersect in 3D', () => {
  const bundle = buildProject(CP01);
  const scene = sceneGraph(bundle);
  const a4 = aabb(envelopeOf(scene, bundle, 'a4'));
  const b1 = aabb(envelopeOf(scene, bundle, 'b1'));
  assert.equal(interiorsIntersect(a4, b1), false, 'a4/b1 must not interpenetrate');
});

test('cp03: every box stays inside the room envelope', () => {
  const bundle = buildProject(CP01);
  const scene = sceneGraph(bundle);
  const xs = bundle.room.walls.flatMap((w) => [w.start.x, w.end.x]);
  const ys = bundle.room.walls.flatMap((w) => [w.start.y, w.end.y]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  for (const m of scene.modules) {
    for (const p of m.parts) {
      for (const c of p.corners) {
        assert.ok(c.x >= minX - TOL && c.x <= maxX + TOL, `${p.id} x in room`);
        assert.ok(c.y >= minY - TOL && c.y <= maxY + TOL, `${p.id} y in room`);
        assert.ok(c.z >= -TOL && c.z <= bundle.room.height + TOL, `${p.id} z in room`);
      }
    }
  }
});

test('cp03: scene graph is deterministic', () => {
  const a = sceneGraph(buildProject(CP01));
  const b = sceneGraph(buildProject(CP01));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
