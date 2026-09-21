/**
 * CP-05 - GLB export of the derived scene.
 *
 * Structural verification of the binary glTF emitted by exportGlb(): container
 * chunks, node/part parity with the BOM, and per-node TRS equal to the kernel's
 * own moduleTransform math (computed here independently of glb.js internals).
 * A full GLTFLoader round-trip is run out-of-band (see CP-05-EVIDENCE.md).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, exportGlb, parseGlb, moduleTransform } from '../index.js';

const TOL = 1e-3;

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

const bundle = buildProject(CP01);
const glb = exportGlb(bundle);
const { json, bin } = parseGlb(glb);

const boxedParts = bundle.parts.filter((p) => p.box);

test('cp05: glb container is well-formed', () => {
  assert.equal(json.asset.version, '2.0');
  assert.equal(json.buffers[0].byteLength, bin.byteLength);
  assert.equal(json.accessors[0].count, 24); // cube positions
  assert.equal(json.accessors[2].count, 36); // cube indices
  const bv = json.bufferViews;
  assert.equal(bv[1].byteOffset, bv[0].byteLength);
  assert.equal(bv[2].byteOffset, bv[0].byteLength + bv[1].byteLength);
});

test('cp05: one node per part + walls + floor', () => {
  assert.equal(json.nodes.length, boxedParts.length + bundle.room.walls.length + 1);
  assert.equal(json.nodes[0].name, 'floor');
  const partNodes = json.nodes.filter((n) => n.name.includes('-') && !n.name.startsWith('wall-') && n.name !== 'floor');
  assert.equal(partNodes.length, boxedParts.length);
});

test('cp05: node TRS equals the kernel transform math', () => {
  let i = 1 + bundle.room.walls.length; // skip floor + walls
  for (const m of bundle.modules) {
    const t = moduleTransform(bundle.room, m);
    for (const p of bundle.parts.filter((q) => q.moduleId === m.id && q.box)) {
      const n = json.nodes[i++];
      const cx = (p.box.min.x + p.box.max.x) / 2;
      const cy = (p.box.min.y + p.box.max.y) / 2;
      const cz = (p.box.min.z + p.box.max.z) / 2;
      const ex = t.origin.x + cx * t.direction.x + cy * t.inwardNormal.x;
      const ey = t.origin.y + cx * t.direction.y + cy * t.inwardNormal.y;
      assert.ok(Math.abs(n.translation[0] - ex) <= TOL, `${n.name} tx`);
      assert.ok(Math.abs(n.translation[1] - ey) <= TOL, `${n.name} ty`);
      assert.ok(Math.abs(n.translation[2] - cz) <= TOL, `${n.name} tz`);
      assert.deepEqual(
        n.scale.map((v) => Math.round(v)),
        [p.box.max.x - p.box.min.x, p.box.max.y - p.box.min.y, p.box.max.z - p.box.min.z],
      );
      const q = n.rotation;
      assert.ok(Math.abs(Math.hypot(...q) - 1) <= 1e-6, 'unit quaternion');
    }
  }
});

test('cp05: export is deterministic', () => {
  const again = exportGlb(buildProject(CP01));
  assert.equal(Buffer.from(again).toString('hex'), Buffer.from(glb).toString('hex'));
});
