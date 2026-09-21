/**
 * Line/polygon intersection and convex-overlap primitives.
 *
 * Everything here is pure math on the plan (X/Y) coordinate system.
 * Nothing in this module knows about furniture.
 */

import { EPS, cross, sub, dot, vec2, approxEqual } from './vec2.js';

/**
 * Intersection point of the two INFINITE lines (p1->p2) and (p3->p4).
 *
 * Used for corner calculation: a room corner is where two wall *axis* lines
 * meet, which is not necessarily a shared endpoint (walls may overshoot,
 * as in a real mitred/butt joint).
 *
 * @returns {{x:number,y:number,t:number,u:number}|null} null when parallel.
 *   `t` is the parameter along p1->p2 (t=1 means "at p2"),
 *   `u` the parameter along p3->p4.
 */
export function lineIntersection(p1, p2, p3, p4) {
  const r = sub(p2, p1);
  const s = sub(p4, p3);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPS) return null; // parallel or degenerate

  const qp = sub(p3, p1);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  return { x: p1.x + t * r.x, y: p1.y + t * r.y, t, u };
}

/**
 * Intersection of two SEGMENTS, or null when they do not cross.
 */
export function segmentIntersection(p1, p2, p3, p4) {
  const hit = lineIntersection(p1, p2, p3, p4);
  if (!hit) return null;
  if (hit.t < -EPS || hit.t > 1 + EPS) return null;
  if (hit.u < -EPS || hit.u > 1 + EPS) return null;
  return vec2(hit.x, hit.y);
}

/** Signed area (shoelace). Positive => counter-clockwise vertex order. */
export function polygonSignedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** 'ccw' | 'cw' | 'degenerate' */
export function polygonOrientation(points) {
  const area = polygonSignedArea(points);
  if (Math.abs(area) < EPS) return 'degenerate';
  return area > 0 ? 'ccw' : 'cw';
}

/**
 * Axis of separation test (SAT) for two convex polygons.
 * Returns true when the polygons overlap by more than `tol`.
 * Touching edges (shared boundary) are NOT an overlap: cabinets in a run
 * are allowed to sit flush against each other.
 */
export function convexPolygonsOverlap(polyA, polyB, tol = EPS) {
  for (const poly of [polyA, polyB]) {
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      // Edge normal as separation axis.
      const axis = { x: -(b.y - a.y), y: b.x - a.x };
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyA) {
        const d = dot(p, axis);
        if (d < minA) minA = d;
        if (d > maxA) maxA = d;
      }
      for (const p of polyB) {
        const d = dot(p, axis);
        if (d < minB) minB = d;
        if (d > maxB) maxB = d;
      }
      if (maxA <= minB + tol || maxB <= minA + tol) return false;
    }
  }
  return true;
}

/** Clip a convex polygon by one half-plane (Sutherland-Hodgman step). */
function clipHalfPlane(poly, insidePoint, inwardNormal) {
  const out = [];
  const side = (p) => dot(sub(p, insidePoint), inwardNormal);
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const dCur = side(cur);
    const dPrev = side(prev);
    const curIn = dCur >= -EPS;
    const prevIn = dPrev >= -EPS;
    if (curIn) {
      if (!prevIn) {
        const edge = sub(cur, prev);
        const denom = dot(edge, inwardNormal);
        if (Math.abs(denom) > EPS) {
          const t = -dPrev / denom;
          out.push(vec2(prev.x + t * edge.x, prev.y + t * edge.y));
        }
      }
      out.push(cur);
    } else if (prevIn) {
      const edge = sub(cur, prev);
      const denom = dot(edge, inwardNormal);
      if (Math.abs(denom) > EPS) {
        const t = -dPrev / denom;
        out.push(vec2(prev.x + t * edge.x, prev.y + t * edge.y));
      }
    }
  }
  return out;
}

/**
 * Clip a convex polygon against a convex window polygon.
 * Returns [] when nothing survives. Both inputs must be convex.
 */
export function clipConvex(subject, window) {
  let out = subject.slice();
  for (let i = 0; i < window.length && out.length; i += 1) {
    const a = window[i];
    const b = window[(i + 1) % window.length];
    const edge = sub(b, a);
    // Interior of a CCW window is to the left of each edge.
    const inward = { x: -edge.y, y: edge.x };
    out = clipHalfPlane(out, a, inward);
  }
  return out;
}

/** Axis-aligned bounding box of a point list. */
export function boundsOf(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Merge a list of 1D intervals and return the merged, sorted list.
 * Intervals touching within `tol` are merged.
 */
export function mergeIntervals(intervals, tol = EPS) {
  if (!intervals.length) return [];
  const sorted = intervals
    .filter((i) => i.to - i.from > tol)
    .slice()
    .sort((a, b) => a.from - b.from);
  const merged = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.from <= last.to + tol) {
      last.to = Math.max(last.to, iv.to);
    } else {
      merged.push({ from: iv.from, to: iv.to });
    }
  }
  return merged;
}

/** Subtract `sub` intervals from `base` intervals. Both must be merged/sorted. */
export function subtractIntervals(base, minus, tol = EPS) {
  let out = base.slice();
  for (const m of minus) {
    const next = [];
    for (const iv of out) {
      if (m.to <= iv.from + tol || m.from >= iv.to - tol) {
        next.push(iv);
        continue;
      }
      if (m.from > iv.from + tol) next.push({ from: iv.from, to: m.from });
      if (m.to < iv.to - tol) next.push({ from: m.to, to: iv.to });
    }
    out = next;
  }
  return out.filter((iv) => iv.to - iv.from > tol);
}

export const pointApproxEqual = (a, b, eps = 1e-6) =>
  approxEqual(a.x, b.x, eps) && approxEqual(a.y, b.y, eps);
