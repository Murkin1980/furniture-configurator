/**
 * CP-01 section 15: wall length, direction, angle, intersection.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lineIntersection,
  segmentIntersection,
  polygonOrientation,
  convexPolygonsOverlap,
  clipConvex,
  mergeIntervals,
} from '../geometry/intersect.js';
import {
  wallAngleDeg,
  wallAngleRad,
  wallDirection,
  wallLength,
  wallPointAt,
  worldToWallOffset,
  turnAngleDeg,
} from '../geometry/wall.js';
import { toRad } from '../geometry/vec2.js';

const TOL = 1e-9;
const near = (actual, expected, tol = TOL, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

const wall = (start, end, id = 'w') => ({ id, start, end });

test('wall length is derived from endpoints', () => {
  near(wallLength(wall({ x: 0, y: 0 }, { x: 2500, y: 0 })), 2500, TOL, 'axis wall');
  near(wallLength(wall({ x: 0, y: 0 }, { x: 0, y: 1500 })), 1500, TOL, 'perpendicular wall');
  // 3-4-5 triangle: length must come from the endpoints, not a stored field.
  near(wallLength(wall({ x: 10, y: 20 }, { x: 310, y: 420 })), 500, TOL, 'diagonal wall');
});

test('wall direction is a unit vector along start -> end', () => {
  const d = wallDirection(wall({ x: 0, y: 0 }, { x: 2500, y: 0 }));
  near(d.x, 1);
  near(d.y, 0);

  const diag = wallDirection(wall({ x: 0, y: 0 }, { x: 300, y: 400 }));
  near(diag.x, 0.6);
  near(diag.y, 0.8);
  near(Math.hypot(diag.x, diag.y), 1, TOL, 'unit length');
});

test('wall angle is derived from endpoints', () => {
  near(wallAngleDeg(wall({ x: 0, y: 0 }, { x: 2500, y: 0 })), 0, TOL, '+X');
  near(wallAngleDeg(wall({ x: 0, y: 0 }, { x: 0, y: 1500 })), 90, TOL, '+Y');
  near(wallAngleDeg(wall({ x: 2500, y: 1500 }, { x: 1000, y: 1500 })), 180, TOL, '-X');
  near(wallAngleDeg(wall({ x: 0, y: 2500 }, { x: 0, y: 0 })), -90, TOL, '-Y');
  near(wallAngleDeg(wall({ x: 0, y: 0 }, { x: 100, y: 100 })), 45, TOL, 'diagonal');
  near(wallAngleRad(wall({ x: 0, y: 0 }, { x: 0, y: 1500 })), Math.PI / 2, TOL, 'radians');
});

test('turn angle between two walls (interior corner)', () => {
  const a = wall({ x: 0, y: 0 }, { x: 2500, y: 0 }, 'a');
  const b = wall({ x: 2500, y: 0 }, { x: 2500, y: 1500 }, 'b');
  near(turnAngleDeg(a, b), 90, TOL, '90 deg left turn');
  near(turnAngleDeg(b, a), -90, TOL, 'reverse is -90');
  // A non-right angle must still be measured, not assumed.
  const c = wall({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 'c');
  near(turnAngleDeg(a, c), 45, TOL, '45 deg turn');
});

test('wall intersection is computed from the two axis lines', () => {
  // Perpendicular axes that share an endpoint.
  const hit = lineIntersection({ x: 0, y: 0 }, { x: 2500, y: 0 }, { x: 2500, y: 0 }, { x: 2500, y: 1500 });
  assert.ok(hit, 'intersection must exist');
  near(hit.x, 2500);
  near(hit.y, 0);

  // Axes that do NOT share an endpoint still intersect at the same point:
  // this is what proves the corner is calculated rather than copied.
  const overshoot = lineIntersection(
    { x: 0, y: 0 },
    { x: 2900, y: 0 },
    { x: 2500, y: -400 },
    { x: 2500, y: 1500 },
  );
  assert.ok(overshoot);
  near(overshoot.x, 2500);
  near(overshoot.y, 0);

  // Move the second wall's axis and the corner must move with it.
  const moved = lineIntersection({ x: 0, y: 0 }, { x: 2500, y: 0 }, { x: 2400, y: 0 }, { x: 2400, y: 1500 });
  near(moved.x, 2400, TOL, 'corner follows the wall');
});

test('parallel lines have no intersection', () => {
  assert.equal(lineIntersection({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }), null);
});

test('segment intersection respects segment extents', () => {
  // Infinite lines cross, but the segments do not.
  assert.equal(
    segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 50, y: -10 }, { x: 50, y: 10 }),
    null,
  );
  const hit = segmentIntersection({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -10 }, { x: 50, y: 10 });
  assert.ok(hit);
  near(hit.x, 50);
  near(hit.y, 0);
});

test('polygon orientation from signed area', () => {
  assert.equal(
    polygonOrientation([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]),
    'ccw',
  );
  assert.equal(
    polygonOrientation([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ]),
    'cw',
  );
});

test('convex overlap: touching edges are not an overlap', () => {
  const a = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const touching = [
    { x: 100, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 100 },
    { x: 100, y: 100 },
  ];
  const overlapping = [
    { x: 50, y: 0 },
    { x: 150, y: 0 },
    { x: 150, y: 100 },
    { x: 50, y: 100 },
  ];
  assert.equal(convexPolygonsOverlap(a, touching), false, 'flush neighbours are allowed');
  assert.equal(convexPolygonsOverlap(a, overlapping), true, 'real overlap is detected');
});

test('convex clipping keeps only the shared region', () => {
  const subject = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 100 },
    { x: 0, y: 100 },
  ];
  const window = [
    { x: 100, y: 0 },
    { x: 300, y: 0 },
    { x: 300, y: 50 },
    { x: 100, y: 50 },
  ];
  const clipped = clipConvex(subject, window);
  assert.ok(clipped.length >= 3, 'clip must survive');
  const xs = clipped.map((p) => p.x);
  const ys = clipped.map((p) => p.y);
  near(Math.min(...xs), 100);
  near(Math.max(...xs), 200);
  near(Math.min(...ys), 0);
  near(Math.max(...ys), 50);
});

test('merging intervals collapses touching ranges', () => {
  const merged = mergeIntervals([
    { from: 560, to: 1030 },
    { from: 1030, to: 1500 },
    { from: 0, to: 100 },
  ]);
  assert.deepEqual(merged, [
    { from: 0, to: 100 },
    { from: 560, to: 1500 },
  ]);
});

test('wallPointAt / worldToWallOffset round-trip', () => {
  const w = wall({ x: 2500, y: 0 }, { x: 2500, y: 1500 }, 'b');
  const p = wallPointAt(w, 560);
  near(p.x, 2500);
  near(p.y, 560);
  const back = worldToWallOffset(w, p);
  near(back.offset, 560);
  near(back.lateral, 0);
  // A point off the axis keeps its lateral distance. The left normal of a +Y
  // wall is -X, so a point at x=1940 (560 mm towards -X) is +560 to the left.
  const off = worldToWallOffset(w, { x: 1940, y: 700 });
  near(off.offset, 700);
  near(off.lateral, 560, TOL, 'left of the wall is positive');
  // Angles stay consistent with the trigonometry.
  near(wallAngleRad(w), toRad(90), TOL);
});
