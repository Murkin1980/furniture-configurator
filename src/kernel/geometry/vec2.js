/**
 * Minimal 2D vector math for the furniture kernel.
 *
 * CP-01 kernel: room geometry lives in a 2D plan coordinate system (mm, Z up).
 * Units are millimetres everywhere in the kernel.
 *
 * Deliberately dependency-free: the repository has no bundler and no runtime
 * dependencies, and CP-01 must not add infrastructure (see ADR).
 */

/** Tolerance for float comparisons, in mm. */
export const EPS = 1e-6;

/** Tolerance for "these two dimensions are the same" checks, in mm. */
export const DIM_EPS = 1e-6;

export const vec2 = (x = 0, y = 0) => ({ x, y });

export const add = (a, b) => vec2(a.x + b.x, a.y + b.y);
export const sub = (a, b) => vec2(a.x - b.x, a.y - b.y);
export const scale = (a, s) => vec2(a.x * s, a.y * s);
export const neg = (a) => vec2(-a.x, -a.y);

export const dot = (a, b) => a.x * b.x + a.y * b.y;

/** 2D cross product (z component of the 3D cross). Sign encodes turn direction. */
export const cross = (a, b) => a.x * b.y - a.y * b.x;

export const length = (a) => Math.hypot(a.x, a.y);

export const dist = (a, b) => length(sub(a, b));

export function normalize(a) {
  const len = length(a);
  if (len < EPS) throw new Error('vec2.normalize: zero-length vector');
  return vec2(a.x / len, a.y / len);
}

/** Left perpendicular: rotate 90 deg counter-clockwise. */
export const perpLeft = (a) => vec2(-a.y, a.x);

/** Right perpendicular: rotate 90 deg clockwise. */
export const perpRight = (a) => vec2(a.y, -a.x);

/** Rotate `a` by `angleRad` counter-clockwise. */
export function rotate(a, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return vec2(a.x * c - a.y * s, a.x * s + a.y * c);
}

/** Angle of `a` from +X axis, radians, in (-PI, PI]. */
export const angleOf = (a) => Math.atan2(a.y, a.x);

export const toDeg = (rad) => (rad * 180) / Math.PI;
export const toRad = (deg) => (deg * Math.PI) / 180;

/** Normalise an angle into [0, 360). */
export function normDeg(deg) {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

export const approxEqual = (a, b, eps = DIM_EPS) => Math.abs(a - b) <= eps;

export const approxVec = (a, b, eps = DIM_EPS) =>
  approxEqual(a.x, b.x, eps) && approxEqual(a.y, b.y, eps);
