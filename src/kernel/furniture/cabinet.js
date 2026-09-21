/**
 * Minimal parametric base cabinet (CP-01 section 12).
 *
 * This module is the SINGLE place where cabinet panel dimensions are computed.
 * Both consumers read from it:
 *
 *   - bom/bom.js  -> uses part.length / part.width / part.thickness / part.edges
 *   - view/*      -> uses part.box (the same numbers, as a 3D box)
 *
 * That is the CP-01 critical invariant: the renderer must not hold its own
 * copy of the dimensions. There is exactly one derivation.
 *
 * Module-local coordinate frame (mm):
 *   X: across the cabinet width, 0 = left side,  W = right side
 *   Y: depth, 0 = back face (against the wall), D = front face
 *   Z: height, 0 = bottom, H = top
 */

/** Default carcass parameters (CP-01 section 12 example). */
export const BASE_CABINET_DEFAULTS = Object.freeze({
  height: 720,
  depth: 560,
  panelThickness: 18,
  facadeThickness: 18,
  railDepth: 100,
  material: 'ldsp_18_white',
  facadeMaterial: 'mdf_matte_white',
});

const noEdges = () => ({
  alongLengthStart: false,
  alongLengthEnd: false,
  alongWidthStart: false,
  alongWidthEnd: false,
});

/**
 * Total edge-banding length for a part, in mm.
 * Each flagged side contributes the length of that side.
 */
export function edgeBandingLength(part) {
  const e = part.edges;
  let total = 0;
  if (e.alongLengthStart) total += part.length;
  if (e.alongLengthEnd) total += part.length;
  if (e.alongWidthStart) total += part.width;
  if (e.alongWidthEnd) total += part.width;
  return total;
}

function makePart({ module, role, name, length, width, thickness, material, grain, edges, box, count = 1 }) {
  if (!(length > 0) || !(width > 0) || !(thickness > 0)) {
    throw new Error(
      `cabinet "${module.id}": part "${role}" has non-positive dimensions ` +
        `(${length} x ${width} x ${thickness}) - parameters are invalid`,
    );
  }
  return {
    id: `${module.id}__${role}`,
    moduleId: module.id,
    role,
    name,
    length,
    width,
    thickness,
    material,
    grain,
    edges,
    box,
    count,
  };
}

/**
 * Generate the parts of one base cabinet from its parameters.
 *
 * @param {object} module FurnitureModule { id, type, width, height, depth, parameters }
 * @returns {{module:object, params:object, parts:object[]}}
 */
export function generateBaseCabinet(module) {
  if (module.type !== 'base-cabinet') {
    throw new Error(`generateBaseCabinet: unsupported module type "${module.type}"`);
  }

  const p = { ...BASE_CABINET_DEFAULTS, ...(module.parameters || {}) };
  const W = module.width;
  const H = module.height ?? p.height;
  const D = module.depth ?? p.depth;
  const t = p.panelThickness;
  const ft = p.facadeThickness;
  const railDepth = Math.min(p.railDepth, D);

  if (!(W > 2 * t)) {
    throw new Error(
      `cabinet "${module.id}": width ${W} mm is too small for ${t} mm side panels`,
    );
  }

  const inner = W - 2 * t;
  const parts = [];

  // Left side panel: D (grain along depth) x H.
  parts.push(
    makePart({
      module,
      role: 'side-left',
      name: 'Боковина левая',
      length: D,
      width: H,
      thickness: t,
      material: p.material,
      grain: 'length',
      edges: { ...noEdges(), alongLengthEnd: true }, // front long edge visible
      box: { min: { x: 0, y: 0, z: 0 }, max: { x: t, y: D, z: H } },
    }),
  );

  // Right side panel: identical cut, mirrored in the assembly.
  parts.push(
    makePart({
      module,
      role: 'side-right',
      name: 'Боковина правая',
      length: D,
      width: H,
      thickness: t,
      material: p.material,
      grain: 'length',
      edges: { ...noEdges(), alongLengthEnd: true },
      box: { min: { x: W - t, y: 0, z: 0 }, max: { x: W, y: D, z: H } },
    }),
  );

  // Bottom panel between the sides.
  parts.push(
    makePart({
      module,
      role: 'bottom',
      name: 'Дно',
      length: inner,
      width: D,
      thickness: t,
      material: p.material,
      grain: 'length',
      edges: { ...noEdges(), alongLengthEnd: true },
      box: { min: { x: t, y: 0, z: 0 }, max: { x: W - t, y: D, z: t } },
    }),
  );

  // One internal horizontal part: the top rail / stretcher ("царга").
  parts.push(
    makePart({
      module,
      role: 'rail-top',
      name: 'Царга верхняя',
      length: inner,
      width: railDepth,
      thickness: t,
      material: p.material,
      grain: 'length',
      edges: noEdges(), // fully enclosed, no visible edge
      box: { min: { x: t, y: 0, z: H - t }, max: { x: W - t, y: railDepth, z: H } },
    }),
  );

  // Facade representation, hung on the front face.
  parts.push(
    makePart({
      module,
      role: 'facade',
      name: 'Фасад',
      length: W,
      width: H,
      thickness: ft,
      material: p.facadeMaterial,
      grain: 'none',
      edges: {
        alongLengthStart: true,
        alongLengthEnd: true,
        alongWidthStart: true,
        alongWidthEnd: true,
      },
      box: { min: { x: 0, y: D, z: 0 }, max: { x: W, y: D + ft, z: H } },
    }),
  );

  return { module, params: { ...p, width: W, height: H, depth: D }, parts };
}

/** Registry so a project can mix module types later without touching the BOM code. */
export const MODULE_GENERATORS = {
  'base-cabinet': generateBaseCabinet,
};

export function generateModuleParts(module) {
  const gen = MODULE_GENERATORS[module.type];
  if (!gen) throw new Error(`generateModuleParts: no generator for type "${module.type}"`);
  return gen(module);
}
