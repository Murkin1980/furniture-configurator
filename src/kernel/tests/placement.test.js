/**
 * CP-01 section 15: wallOffset -> world coordinates, module orientation,
 * overlap/collision, corner reservation and run occupancy.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRoom } from '../room/room.js';
import { moduleFootprint, moduleTransform } from '../furniture/moduleGeometry.js';
import {
  blockedIntervalsOnWall,
  computeReservations,
  cornerOccupancy,
  findOverlaps,
  layoutModules,
  packRuns,
  wallOccupancy,
  moduleWithinWall,
} from '../placement/placement.js';

const TOL = 1e-9;
const near = (actual, expected, tol = TOL, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

const L_ROOM = {
  id: 'r',
  height: 2500,
  walls: [
    { id: 'a', start: { x: 0, y: 0 }, end: { x: 2500, y: 0 }, thickness: 100 },
    { id: 'b', start: { x: 2500, y: 0 }, end: { x: 2500, y: 1500 }, thickness: 100 },
    { id: 'c', start: { x: 2500, y: 1500 }, end: { x: 0, y: 1500 }, thickness: 100 },
    { id: 'd', start: { x: 0, y: 1500 }, end: { x: 0, y: 0 }, thickness: 100 },
  ],
};

const cab = (id, wallId, width, extra = {}) => ({
  id,
  type: 'base-cabinet',
  width,
  height: 720,
  depth: 560,
  wallId,
  ...extra,
});

test('wallOffset maps to world coordinates along the wall', () => {
  const room = buildRoom(L_ROOM);
  // Wall A runs along +X from the origin.
  const onA = moduleTransform(room, cab('m', 'a', 600, { wallOffset: 1200 }));
  near(onA.origin.x, 1200);
  near(onA.origin.y, 0);

  // Wall B runs along +Y from (2500,0): the offset moves in Y, not X.
  const onB = moduleTransform(room, cab('m', 'b', 470, { wallOffset: 560 }));
  near(onB.origin.x, 2500);
  near(onB.origin.y, 560);
});

test('a module is oriented to its wall and stands inside the room', () => {
  const room = buildRoom(L_ROOM);

  const onA = moduleTransform(room, cab('m', 'a', 600, { wallOffset: 0 }));
  near(onA.angleRad, 0, TOL, 'wall A module rotation');
  let fp = moduleFootprint(room, cab('m', 'a', 600, { wallOffset: 0 }));
  assert.deepEqual(
    fp.map((p) => [p.x, p.y]),
    [
      [0, 0],
      [600, 0],
      [600, 560],
      [0, 560],
    ],
    'wall A footprint extends into the room along +Y',
  );

  const onB = moduleTransform(room, cab('n', 'b', 470, { wallOffset: 560 }));
  near(onB.angleRad, Math.PI / 2, TOL, 'wall B module rotation is 90 deg');
  fp = moduleFootprint(room, cab('n', 'b', 470, { wallOffset: 560 }));
  assert.deepEqual(
    fp.map((p) => [p.x, p.y]),
    [
      [2500, 560],
      [2500, 1030],
      [1940, 1030],
      [1940, 560],
    ],
    'wall B footprint extends into the room along -X',
  );
});

test('overlap is detected, flush neighbours are not', () => {
  const room = buildRoom(L_ROOM);
  const flush = [cab('a1', 'a', 600, { wallOffset: 0 }), cab('a2', 'a', 600, { wallOffset: 600 })];
  assert.deepEqual(findOverlaps(room, flush), [], 'flush cabinets in a run are legal');

  const clashing = [cab('a1', 'a', 600, { wallOffset: 0 }), cab('a2', 'a', 600, { wallOffset: 500 })];
  const hits = findOverlaps(room, clashing);
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0], { a: 'a1', b: 'a2' });
});

test('the L-corner clashes without a reservation and is clean with it', () => {
  const room = buildRoom(L_ROOM);

  // Naive: both runs start at their wall offset 0. They collide in the corner.
  const naive = [cab('a4', 'a', 700, { wallOffset: 1800 }), cab('b1', 'b', 470, { wallOffset: 0 })];
  assert.equal(findOverlaps(room, naive).length, 1, 'the corner really does collide');

  // Reserved: wall B stands off by wall A's cabinet depth (560 mm).
  const reserved = [cab('a4', 'a', 700, { wallOffset: 1800 }), cab('b1', 'b', 470, { wallOffset: 560 })];
  assert.deepEqual(findOverlaps(room, reserved), [], 'with the setback the corner is clean');
});

test('corner reservation is computed from geometry, not typed in', () => {
  const room = buildRoom(L_ROOM);
  const modules = [cab('a4', 'a', 700, { wallOffset: 1800 })];

  const blocked = blockedIntervalsOnWall(room, modules, 'b');
  assert.equal(blocked.length, 1);
  near(blocked[0].from, 0);
  near(blocked[0].to, 560, TOL, 'blocked length equals the corner cabinet depth');

  const res = computeReservations(room, modules).get('b');
  near(res.atStart, 560, TOL, 'wall B must stand off 560 mm');
  near(res.atEnd, 0);
});

test('the reservation follows the corner cabinet depth', () => {
  const room = buildRoom(L_ROOM);
  const shallow = [cab('a4', 'a', 700, { wallOffset: 1800, depth: 400 })];
  near(computeReservations(room, shallow).get('b').atStart, 400, TOL, 'depth 400 -> stand-off 400');

  const deep = [cab('a4', 'a', 700, { wallOffset: 1800, depth: 600 })];
  near(computeReservations(room, deep).get('b').atStart, 600, TOL, 'depth 600 -> stand-off 600');
});

test('auto-packed runs lay modules end to end and respect the corner', () => {
  const room = buildRoom(L_ROOM);
  const modules = [
    cab('a1', 'a', 600, { autoOffset: true }),
    cab('a2', 'a', 600, { autoOffset: true }),
    cab('a3', 'a', 600, { autoOffset: true }),
    cab('a4', 'a', 700, { autoOffset: true }),
    cab('b1', 'b', 470, { autoOffset: true }),
    cab('b2', 'b', 470, { autoOffset: true }),
  ];

  const laid = layoutModules(room, modules);
  const offsets = Object.fromEntries(laid.map((m) => [m.id, m.wallOffset]));
  assert.deepEqual(offsets, { a1: 0, a2: 600, a3: 1200, a4: 1800, b1: 560, b2: 1030 });
  assert.deepEqual(findOverlaps(room, laid), [], 'the packed layout must be collision free');
});

test('layout is deterministic across repeated runs', () => {
  const room = buildRoom(L_ROOM);
  const modules = [
    cab('a1', 'a', 800, { autoOffset: true }),
    cab('b1', 'b', 500, { autoOffset: true }),
    cab('b2', 'b', 400, { autoOffset: true }),
  ];
  const first = layoutModules(room, modules).map((m) => m.wallOffset);
  const second = layoutModules(room, modules).map((m) => m.wallOffset);
  assert.deepEqual(first, second);
});

test('corner occupancy names the module that owns the corner', () => {
  const room = buildRoom(L_ROOM);
  const modules = layoutModules(room, [
    cab('a1', 'a', 600, { wallOffset: 0 }),
    cab('a2', 'a', 700, { wallOffset: 1800 }),
    cab('b1', 'b', 470, { autoOffset: true }),
  ]);
  const corner = room.cornerAtEndOf('a');
  const occ = cornerOccupancy(room, modules, corner);
  assert.ok(occ, 'corner must be owned by a module');
  assert.equal(occ.moduleId, 'a2');
  assert.equal(occ.wallId, 'a');
  near(occ.depth, 560);
});

test('an empty corner reports no owner', () => {
  const room = buildRoom(L_ROOM);
  const modules = [cab('a1', 'a', 600, { wallOffset: 0 })];
  assert.equal(cornerOccupancy(room, modules, room.cornerAtEndOf('a')), null);
});

test('wall occupancy reports occupied and free intervals', () => {
  const room = buildRoom(L_ROOM);
  const modules = layoutModules(room, [
    cab('a1', 'a', 600, { autoOffset: true }),
    cab('a2', 'a', 600, { autoOffset: true }),
    cab('b1', 'b', 470, { autoOffset: true }),
  ]);

  // No Wall A cabinet reaches the corner, so Wall B is free from offset 0.
  const a = wallOccupancy(room, modules, 'a');
  near(a.length, 2500);
  assert.deepEqual(a.occupied, [{ from: 0, to: 1200 }]);
  assert.deepEqual(a.free, [{ from: 1200, to: 2500 }]);

  const b = wallOccupancy(room, modules, 'b');
  assert.deepEqual(b.occupied, [{ from: 0, to: 470 }]);
  assert.deepEqual(b.free, [{ from: 470, to: 1500 }]);
});

test('wall occupancy leaves the reserved corner strip empty', () => {
  const room = buildRoom(L_ROOM);
  // a2 now runs all the way to the corner, so Wall B must stand off.
  const modules = layoutModules(room, [
    cab('a1', 'a', 600, { autoOffset: true }),
    cab('a2', 'a', 1900, { autoOffset: true }),
    cab('b1', 'b', 470, { autoOffset: true }),
  ]);

  const a = wallOccupancy(room, modules, 'a');
  assert.deepEqual(a.occupied, [{ from: 0, to: 2500 }]);
  assert.deepEqual(a.free, [], 'a full run leaves no gap');

  const b = wallOccupancy(room, modules, 'b');
  assert.deepEqual(b.occupied, [{ from: 560, to: 1030 }]);
  assert.deepEqual(b.free, [
    { from: 0, to: 560 },
    { from: 1030, to: 1500 },
  ]);
});

test('moduleWithinWall catches modules hanging off the end', () => {
  const room = buildRoom(L_ROOM);
  assert.equal(moduleWithinWall(room, cab('ok', 'b', 470, { wallOffset: 1030 })), true);
  assert.equal(moduleWithinWall(room, cab('bad', 'b', 470, { wallOffset: 1031 })), false);
});

test('packRuns respects explicitly authored offsets', () => {
  const room = buildRoom(L_ROOM);
  const reservations = computeReservations(room, []);
  const packed = packRuns(
    room,
    [cab('a1', 'a', 600, { wallOffset: 300 }), cab('a2', 'a', 600, { autoOffset: true })],
    reservations,
  );
  assert.deepEqual(
    packed.map((m) => m.wallOffset),
    [300, 900],
    'the auto module packs after the authored one',
  );
});
