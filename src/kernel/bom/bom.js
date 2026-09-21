/**
 * Parts -> BOM -> cutting summary.
 *
 * Input is ONLY the part list produced by the furniture generators. The BOM
 * layer never recomputes a dimension; it aggregates what the parametric
 * generator already decided. That keeps CP-01's one-way flow:
 *
 *   Canonical Model -> Parametric Kernel -> { View | BOM | Validation }
 */

import { edgeBandingLength } from '../furniture/cabinet.js';
import { generateModuleParts } from '../furniture/cabinet.js';

/** Flat list of every part of every module. */
export function deriveParts(modules) {
  const parts = [];
  for (const module of modules) {
    const { parts: moduleParts } = generateModuleParts(module);
    parts.push(...moduleParts);
  }
  return parts;
}

/**
 * Stable identity for "these two panels are the same cut".
 *
 * Orientation is part of the identity: LDSP/MDF carry a grain and a texture
 * direction, so a 720x560 and a 560x720 cut are NOT interchangeable. Merging
 * across orientation is a nesting decision, and CP-01 section 16 keeps the
 * cutting optimiser out of scope.
 */
function bomKey(part) {
  const e = part.edges;
  const edgeSig = [
    e.alongLengthStart ? 'L' : '-',
    e.alongLengthEnd ? 'L' : '-',
    e.alongWidthStart ? 'W' : '-',
    e.alongWidthEnd ? 'W' : '-',
  ].join('');
  return [
    part.material,
    part.thickness,
    round(part.length),
    round(part.width),
    part.grain,
    edgeSig,
  ].join('|');
}

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * Aggregate parts into BOM lines.
 *
 * @returns {Array<{key,material,thickness,length,width,edges,grain,label,
 *                  count,areaM2,bandingM,partIds}>}
 */
export function deriveBom(parts) {
  const map = new Map();
  for (const part of parts) {
    const count = part.count ?? 1;
    const key = bomKey(part);
    let line = map.get(key);
    if (!line) {
      line = {
        key,
        material: part.material,
        thickness: part.thickness,
        length: round(part.length),
        width: round(part.width),
        edges: { ...part.edges },
        grain: part.grain,
        label: part.name,
        roles: [],
        partIds: [],
        count: 0,
        areaM2: 0,
        bandingM: 0,
      };
      map.set(key, line);
    }
    line.count += count;
    line.areaM2 += (part.length * part.width * count) / 1e6;
    line.bandingM += (edgeBandingLength(part) * count) / 1000;
    line.partIds.push(part.id);
    if (!line.roles.includes(part.role)) line.roles.push(part.role);
  }
  return [...map.values()].sort((a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
  );
}

/** Totals across the whole BOM. */
export function bomTotals(bom) {
  return bom.reduce(
    (acc, line) => ({
      lines: acc.lines + 1,
      panels: acc.panels + line.count,
      areaM2: acc.areaM2 + line.areaM2,
      bandingM: acc.bandingM + line.bandingM,
    }),
    { lines: 0, panels: 0, areaM2: 0, bandingM: 0 },
  );
}

/**
 * Group BOM lines by material + thickness (how a cutting shop splits a job).
 *
 * `sheetEstimate` is a LOWER BOUND from raw area only. It is NOT a nesting
 * result: CP-01 section 16 puts the cutting optimiser out of scope, so this
 * is labelled honestly rather than pretending to pack sheets.
 */
export function cuttingGroups(bom, { sheetWidth = 2800, sheetHeight = 2070, kerf = 0 } = {}) {
  const groups = new Map();
  for (const line of bom) {
    const key = `${line.material}|${line.thickness}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        material: line.material,
        thickness: line.thickness,
        panels: 0,
        areaM2: 0,
        bandingM: 0,
        lines: [],
      };
      groups.set(key, g);
    }
    g.panels += line.count;
    g.areaM2 += line.areaM2;
    g.bandingM += line.bandingM;
    g.lines.push(line.key);
  }
  const sheetAreaM2 = ((sheetWidth - kerf) * (sheetHeight - kerf)) / 1e6;
  return [...groups.values()].map((g) => ({
    ...g,
    sheetAreaM2,
    sheetEstimateLowerBound: Math.ceil(g.areaM2 / sheetAreaM2),
  }));
}
