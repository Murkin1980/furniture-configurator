/**
 * GLB (binary glTF 2.0) export of the derived scene (CP-05).
 *
 * Pure and dependency-free: consumes sceneGraph() and emits one node per box
 * (parts, walls, floor) as a shared unit-cube mesh positioned by node TRS
 * (translation/rotation/scale). No dimensions are re-derived here beyond what
 * sceneGraph already provides - the export is a projection of derived data, in
 * line with the one-way flow.
 *
 * The result opens in any glTF viewer (three.js GLTFLoader, Blender, ...).
 */

import { sceneGraph } from './scene3d.js';

// 24-vertex unit cube (centred, size 1) with per-face normals.
const CUBE_POS = [];
const CUBE_NOR = [];
const FACES = [
  // [normal, 4 corners]
  [[0, 0, -1], [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]]],
  [[0, 0, 1], [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
  [[0, -1, 0], [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]]],
  [[0, 1, 0], [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
  [[-1, 0, 0], [[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]]],
  [[1, 0, 0], [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]]],
];
for (const [n, corners] of FACES) {
  for (const c of corners) {
    CUBE_POS.push(...c);
    CUBE_NOR.push(...n);
  }
}
const CUBE_IDX = [];
for (let f = 0; f < 6; f++) {
  const o = f * 4;
  CUBE_IDX.push(o, o + 1, o + 2, o, o + 2, o + 3);
}

/** Quaternion from an orthonormal basis given as column vectors. */
function quatFromBasis(b) {
  const m00 = b.x.x, m01 = b.y.x, m02 = b.z.x;
  const m10 = b.x.y, m11 = b.y.y, m12 = b.z.y;
  const m20 = b.x.z, m21 = b.y.z, m22 = b.z.z;
  const trace = m00 + m11 + m22;
  let x, y, z, w;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4;
  }
  return [x, y, z, w];
}

const worldCenter = (b, min, max) => {
  const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
  return [
    b.origin.x + cx * b.x.x + cy * b.y.x + cz * b.z.x,
    b.origin.y + cx * b.x.y + cy * b.y.y + cz * b.z.y,
    b.origin.z + cx * b.x.z + cy * b.y.z + cz * b.z.z,
  ];
};

const MATERIALS = [
  { name: 'cabinet', pbrMetallicRoughness: { baseColorFactor: [0.72, 0.6, 0.35, 1] } },
  { name: 'wall', pbrMetallicRoughness: { baseColorFactor: [0.56, 0.64, 0.78, 1] } },
  { name: 'floor', pbrMetallicRoughness: { baseColorFactor: [0.12, 0.16, 0.3, 1] } },
];

/**
 * @param {object} bundle output of buildProject()
 * @returns {Uint8Array} binary glTF (GLB)
 */
export function exportGlb(bundle) {
  const scene = sceneGraph(bundle);

  const entries = [];
  entries.push({ name: 'floor', basis: idBasis(), min: scene.floor.min, max: scene.floor.max, material: 2 });
  for (const w of scene.walls) {
    entries.push({ name: `wall-${w.id}`, basis: w.basis, min: w.min, max: w.max, material: 1 });
  }
  for (const m of scene.modules) {
    for (const p of m.parts) {
      entries.push({ name: `${m.id}-${p.role}`, basis: m.basis, min: p.min, max: p.max, material: 0 });
    }
  }

  const nodes = entries.map((e) => ({
    name: e.name,
    translation: worldCenter(e.basis, e.min, e.max),
    rotation: quatFromBasis(e.basis),
    scale: [e.max.x - e.min.x, e.max.y - e.min.y, e.max.z - e.min.z],
    mesh: e.material, // mesh i == material i (one primitive each)
  }));

  const meshes = MATERIALS.map((mat, i) => ({
    name: `cube-${mat.name}`,
    primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: i }],
  }));

  const posBytes = CUBE_POS.length * 4;
  const norBytes = CUBE_NOR.length * 4;
  const idxBytes = CUBE_IDX.length * 2;
  const binLength = posBytes + norBytes + idxBytes; // all offsets already 4-aligned

  const accessors = [
    {
      bufferView: 0, componentType: 5126, count: CUBE_POS.length / 3, type: 'VEC3',
      min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5],
    },
    { bufferView: 1, componentType: 5126, count: CUBE_NOR.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: CUBE_IDX.length, type: 'SCALAR' },
  ];
  const bufferViews = [
    { buffer: 0, byteOffset: 0, byteLength: posBytes },
    { buffer: 0, byteOffset: posBytes, byteLength: norBytes },
    { buffer: 0, byteOffset: posBytes + norBytes, byteLength: idxBytes },
  ];

  const json = {
    asset: { version: '2.0', generator: 'furniture-configurator kernel (CP-05)' },
    scene: 0,
    scenes: [{ name: bundle.id ?? 'kitchen', nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials: MATERIALS,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binLength }],
  };

  // --- binary assembly -----------------------------------------------------
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  if (jsonPad) {
    const padded = new Uint8Array(jsonBytes.length + jsonPad).fill(0x20);
    padded.set(jsonBytes);
    jsonBytes = padded;
  }
  const bin = new Uint8Array(binLength);
  const dv = new DataView(bin.buffer);
  CUBE_POS.forEach((v, i) => dv.setFloat32(i * 4, v, true));
  CUBE_NOR.forEach((v, i) => dv.setFloat32(posBytes + i * 4, v, true));
  CUBE_IDX.forEach((v, i) => dv.setUint16(posBytes + norBytes + i * 2, v, true));

  const total = 12 + 8 + jsonBytes.length + 8 + binLength;
  const glb = new Uint8Array(total);
  const hd = new DataView(glb.buffer);
  hd.setUint32(0, 0x46546c67, true); // 'glTF'
  hd.setUint32(4, 2, true);
  hd.setUint32(8, total, true);
  hd.setUint32(12, jsonBytes.length, true);
  hd.setUint32(16, 0x4e4f534a, true); // 'JSON'
  glb.set(jsonBytes, 20);
  let o = 20 + jsonBytes.length;
  hd.setUint32(o, binLength, true);
  hd.setUint32(o + 4, 0x004e4942, true); // 'BIN'
  glb.set(bin, o + 8);
  return glb;
}

const idBasis = () => ({
  origin: { x: 0, y: 0, z: 0 },
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
});

/** Minimal GLB container parser (for tests/debug): {json, bin}. */
export function parseGlb(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('parseGlb: not a GLB');
  const total = dv.getUint32(8, true);
  if (total !== bytes.byteLength) throw new Error('parseGlb: length mismatch');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < total) {
    const len = dv.getUint32(offset, true);
    const type = dv.getUint32(offset + 4, true);
    const chunk = bytes.subarray(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + len;
  }
  return { json, bin };
}
