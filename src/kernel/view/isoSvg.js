/**
 * Derived isometric wireframe.
 *
 * This is the strongest form of the CP-01 section 8 invariant: the 3D drawing
 * is built from `part.box`, i.e. from the very same numbers the BOM reports.
 * There is no second set of cabinet dimensions anywhere in the view layer.
 */

import { moduleTransform } from '../furniture/moduleGeometry.js';

const fmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

/** Isometric projection of a world point (mm) to view units. */
export function isoProject(x, y, z) {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z };
}

const BOX_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/** Local box corners -> 8 world points using the module transform. */
function boxToWorld(transform, box) {
  const corners = [];
  for (const z of [box.min.z, box.max.z]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const x of [box.min.x, box.max.x]) {
        corners.push([x, y, z]);
      }
    }
  }
  const zOff = transform.bottomZ ?? 0; // derived elevation (CP-12), read not re-derived
  return corners.map(([x, y, z]) => {
    const wx =
      transform.origin.x + x * transform.direction.x + y * transform.inwardNormal.x;
    const wy =
      transform.origin.y + x * transform.direction.y + y * transform.inwardNormal.y;
    return isoProject(wx, wy, z + zOff);
  });
}

const FILL_BY_MATERIAL = {
  ldsp_18_white: '#fde68a',
  mdf_matte_white: '#bfdbfe',
};

/**
 * @param {object} bundle output of buildProject()
 * @returns {string} SVG markup
 */
export function isoSvg(bundle, opts = {}) {
  const { margin = 60, highlightModuleId = null } = opts;

  const segments = [];
  const projected = [];

  // Room walls as floor lines, so the cabinets have spatial context.
  for (const w of bundle.room.walls) {
    const a = isoProject(w.start.x, w.start.y, 0);
    const b = isoProject(w.end.x, w.end.y, 0);
    segments.push(`<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="#9ca3af" stroke-width="3"/>`);
    projected.push(a, b);
  }

  // One wireframe box per PART, taken straight from part.box.
  const transforms = new Map(
    bundle.modules.map((m) => [
      m.id,
      { ...moduleTransform(bundle.room, m), bottomZ: m.bottomZ ?? 0 },
    ]),
  );
  for (const part of bundle.parts) {
    if (!part.box) continue;
    const transform = transforms.get(part.moduleId);
    if (!transform) continue;
    const world = boxToWorld(transform, part.box);
    const fill = FILL_BY_MATERIAL[part.material] ?? '#e5e7eb';
    const stroke = highlightModuleId === part.moduleId ? '#b45309' : '#374151';
    const sw = highlightModuleId === part.moduleId ? 2 : 1;
    const pts = world.map((p) => `${fmt(p.x)},${fmt(p.y)}`);
    const face = `<polygon points="${pts[0]} ${pts[1]} ${pts[3]} ${pts[2]}" fill="${fill}" fill-opacity="0.35" stroke="none"/>`;
    segments.push(face);
    for (const [i, j] of BOX_EDGES) {
      segments.push(
        `<line x1="${fmt(world[i].x)}" y1="${fmt(world[i].y)}" x2="${fmt(world[j].x)}" y2="${fmt(world[j].y)}" stroke="${stroke}" stroke-width="${sw}"/>`,
      );
    }
    projected.push(...world);
  }

  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs) - margin;
  const maxX = Math.max(...xs) + margin;
  const minY = Math.min(...ys) - margin;
  const maxY = Math.max(...ys) + margin;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(maxX - minX)} ${fmt(maxY - minY)}" width="100%" role="img" aria-label="Isometric wireframe">`,
    ...segments,
    '</svg>',
  ].join('\n');
}
