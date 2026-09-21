import { moduleFootprint } from '../furniture/moduleGeometry.js';
import { maxModuleDepth } from '../placement/placement.js';
import { add, scale } from '../geometry/vec2.js';
import { wallPointAt } from '../geometry/wall.js';

/**
 * Derived plan view (top-down).
 *
 * CP-01 section 8: this file holds NO dimensions of its own. Every number it
 * draws is read out of a bundle produced by buildProject(): wall lengths and
 * corners from `bundle.room`, module rectangles from `moduleFootprint()`.
 * If the kernel changes a dimension, this drawing changes with it.
 */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

/**
 * @param {object} bundle output of buildProject()
 * @param {object} [opts]
 * @returns {string} SVG markup
 */
export function planSvg(bundle, opts = {}) {
  const {
    margin = 120,
    grid = 250,
    showGrid = true,
    showDimensions = true,
    showCorners = true,
    highlightModuleId = null,
  } = opts;

  const room = bundle.room;
  const xs = [];
  const ys = [];
  for (const w of room.walls) {
    xs.push(w.start.x, w.end.x);
    ys.push(w.start.y, w.end.y);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + margin * 2;
  const height = maxY - minY + margin * 2;
  // World +Y is drawn upwards, so screen Y is flipped.
  const sx = (x) => x - minX + margin;
  const sy = (y) => maxY - y + margin;

  const out = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" ` +
      `width="100%" role="img" aria-label="Plan view">`,
  );
  out.push(
    `<style>
      .w{stroke:#1f2937;stroke-width:14;fill:none;stroke-linecap:square}
      .g{stroke:#e5e7eb;stroke-width:1}
      .m{fill:#60a5fa;fill-opacity:.28;stroke:#1d4ed8;stroke-width:2}
      .m.hi{fill:#f59e0b;fill-opacity:.45;stroke:#b45309;stroke-width:3}
      .m.err{fill:#f87171;fill-opacity:.5;stroke:#b91c1c;stroke-width:3}
      .res{fill:#ef4444;fill-opacity:.12;stroke:#dc2626;stroke-width:2;stroke-dasharray:6 4}
      .run{stroke:#059669;stroke-width:3;fill:none}
      .runh{fill:#059669}
      .runlbl{font:600 22px ui-monospace,monospace;fill:#047857}
      .lbl{font:600 26px ui-monospace,monospace;fill:#111827}
      .dim{font:500 24px ui-monospace,monospace;fill:#6b7280}
      .cor{fill:#dc2626}
      .op{stroke:#0ea5e9;stroke-width:6;fill:none}
    </style>`,
  );

  if (showGrid) {
    for (let x = Math.ceil(minX / grid) * grid; x <= maxX; x += grid) {
      out.push(`<line class="g" x1="${fmt(sx(x))}" y1="${fmt(sy(minY))}" x2="${fmt(sx(x))}" y2="${fmt(sy(maxY))}"/>`);
    }
    for (let y = Math.ceil(minY / grid) * grid; y <= maxY; y += grid) {
      out.push(`<line class="g" x1="${fmt(sx(minX))}" y1="${fmt(sy(y))}" x2="${fmt(sx(maxX))}" y2="${fmt(sy(y))}"/>`);
    }
  }

  // Openings, drawn before the walls so the wall line reads on top.
  for (const o of room.openings) {
    out.push(
      `<line class="op" data-opening="${esc(o.id)}" x1="${fmt(sx(o.start.x))}" y1="${fmt(sy(o.start.y))}" ` +
        `x2="${fmt(sx(o.end.x))}" y2="${fmt(sy(o.end.y))}"/>`,
    );
  }

  // Walls.
  for (const w of room.walls) {
    out.push(
      `<line class="w" x1="${fmt(sx(w.start.x))}" y1="${fmt(sy(w.start.y))}" ` +
        `x2="${fmt(sx(w.end.x))}" y2="${fmt(sy(w.end.y))}"/>`,
    );
  }

  // Modules whose placement is invalid (overlap / cannot place / conflict).
  const errorIds = new Set();
  for (const issue of bundle.issues ?? []) {
    if (issue.severity !== 'error') continue;
    for (const token of issue.subject.split('+')) errorIds.add(token.trim());
  }

  // Corner reservations / stand-offs, drawn as hatched zones (derived data).
  const depth = maxModuleDepth(bundle.modules);
  for (const w of room.walls) {
    const res = bundle.reservations?.get(w.id) ?? { atStart: 0, atEnd: 0 };
    for (const [from, to] of [
      [0, res.atStart],
      [w.length - res.atEnd, w.length],
    ]) {
      if (to - from <= 1e-6) continue;
      const p0 = wallPointAt(w, from);
      const p1 = wallPointAt(w, to);
      const inward = scale(w.inwardNormal, depth);
      const poly = [p0, p1, add(p1, inward), add(p0, inward)];
      const pts = poly.map((p) => `${fmt(sx(p.x))},${fmt(sy(p.y))}`).join(' ');
      out.push(`<polygon class="res" points="${pts}"><title>corner reservation ${esc(w.id)}</title></polygon>`);
    }
  }

  // Runs (CP-02 §7): fill-direction arrows + labels, derived from bundle.runs.
  for (const run of bundle.runs ?? []) {
    const w = room.wall(run.wallId);
    if (!w || w.length < 320) continue;
    const shift = scale(w.inwardNormal, depth + 120);
    const from = run.startPoint === 'end' ? w.length - 40 : 40;
    const to = run.startPoint === 'end' ? w.length - 260 : 260;
    const a = add(wallPointAt(w, from), shift);
    const b = add(wallPointAt(w, to), shift);
    out.push(
      `<line class="run" x1="${fmt(sx(a.x))}" y1="${fmt(sy(a.y))}" x2="${fmt(sx(b.x))}" y2="${fmt(sy(b.y))}"/>`,
    );
    const d = scale(w.direction, run.startPoint === 'end' ? -1 : 1);
    const h1 = add(b, add(scale(d, -45), scale(w.inwardNormal, 26)));
    const h2 = add(b, add(scale(d, -45), scale(w.inwardNormal, -26)));
    out.push(
      `<polygon class="runh" points="${fmt(sx(b.x))},${fmt(sy(b.y))} ${fmt(sx(h1.x))},${fmt(sy(h1.y))} ${fmt(sx(h2.x))},${fmt(sy(h2.y))}"/>`,
    );
    const lbl = add(wallPointAt(w, (from + to) / 2), scale(w.inwardNormal, depth + 200));
    out.push(
      `<text class="runlbl" x="${fmt(sx(lbl.x))}" y="${fmt(sy(lbl.y))}" text-anchor="middle">` +
        `run ${esc(run.wallId)} · ${esc(run.startPoint)} · ${run.moduleIds.length}</text>`,
    );
  }

  // Modules, from the derived footprints.
  const footprints = new Map(
    bundle.modules.map((m) => [m.id, moduleFootprint(room, m)]),
  );
  for (const m of bundle.modules) {
    const fp = footprints.get(m.id);
    const pts = fp.map((p) => `${fmt(sx(p.x))},${fmt(sy(p.y))}`).join(' ');
    const cls = errorIds.has(m.id) ? 'm err' : highlightModuleId === m.id ? 'm hi' : 'm';
    out.push(`<polygon class="${cls}" data-module="${esc(m.id)}" points="${pts}"><title>${esc(m.id)} ${fmt(m.width)} mm</title></polygon>`);
  }

  if (showDimensions) {
    // Wall lengths, placed at the wall midpoint pushed outwards.
    for (const w of room.walls) {
      const mx = (w.start.x + w.end.x) / 2 - w.inwardNormal.x * 90;
      const my = (w.start.y + w.end.y) / 2 - w.inwardNormal.y * 90;
      out.push(
        `<text class="dim" x="${fmt(sx(mx))}" y="${fmt(sy(my))}" text-anchor="middle">` +
          `${esc(w.id)} ${fmt(w.length)} @ ${fmt(w.angleDeg)}°</text>`,
      );
    }
    // Module ids and widths at the footprint centre.
    for (const m of bundle.modules) {
      const fp = footprints.get(m.id);
      const cx = fp.reduce((s, p) => s + p.x, 0) / fp.length;
      const cy = fp.reduce((s, p) => s + p.y, 0) / fp.length;
      out.push(
        `<text class="lbl" x="${fmt(sx(cx))}" y="${fmt(sy(cy))}" text-anchor="middle">` +
          `${esc(m.id)}<tspan class="dim" x="${fmt(sx(cx))}" dy="28">${fmt(m.width)}</tspan></text>`,
      );
    }
  }

  if (showCorners) {
    // Prefer the derived corners from buildProject(): those carry occupancy.
    const corners = bundle.corners ?? room.corners;
    corners.forEach((c, ci) => {
      out.push(`<circle class="cor" data-corner="${ci}" cx="${fmt(sx(c.point.x))}" cy="${fmt(sy(c.point.y))}" r="9"/>`);
      const lx = c.point.x + c.bisector.x * 150;
      const ly = c.point.y + c.bisector.y * 150;
      const owner = c.occupancy?.moduleId ?? 'free';
      out.push(
        `<text class="dim" x="${fmt(sx(lx))}" y="${fmt(sy(ly))}" text-anchor="middle">` +
          `${fmt(c.turnDeg)}° · ${esc(owner)}</text>`,
      );
    });
  }

  out.push('</svg>');
  return out.join('\n');
}
