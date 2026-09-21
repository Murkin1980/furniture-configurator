/**
 * CP-01 section 13: the 90 deg corner gate, at the room level.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRoom } from '../room/room.js';

const TOL = 1e-9;
const near = (actual, expected, tol = TOL, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ~${expected}, got ${actual}`);

/** Two perpendicular walls + a closing wall, as a minimal closed room. */
const cornerRoom = (aLen = 2500, bLen = 1500, bX = null) => ({
  id: 'r',
  height: 2500,
  walls: [
    { id: 'a', start: { x: 0, y: 0 }, end: { x: aLen, y: 0 }, thickness: 100 },
    { id: 'b', start: { x: bX ?? aLen, y: 0 }, end: { x: bX ?? aLen, y: bLen }, thickness: 100 },
    { id: 'c', start: { x: bX ?? aLen, y: bLen }, end: { x: 0, y: bLen }, thickness: 100 },
    { id: 'd', start: { x: 0, y: bLen }, end: { x: 0, y: 0 }, thickness: 100 },
  ],
});

test('room derives direction, length, angle and inward normal per wall', () => {
  const room = buildRoom(cornerRoom());
  assert.equal(room.orientation, 'ccw');

  const a = room.wall('a');
  near(a.length, 2500, TOL, 'wall A length');
  near(a.angleDeg, 0, TOL, 'wall A angle');
  near(a.direction.x, 1);
  near(a.direction.y, 0);
  near(a.inwardNormal.x, 0);
  near(a.inwardNormal.y, 1, TOL, 'wall A points into the room');

  const b = room.wall('b');
  near(b.length, 1500, TOL, 'wall B length');
  near(b.angleDeg, 90, TOL, 'wall B angle');
  near(b.inwardNormal.x, -1, TOL, 'wall B points into the room');
  near(b.inwardNormal.y, 0);
});

test('corner point is calculated by line intersection, not authored', () => {
  const room = buildRoom(cornerRoom());
  const corner = room.cornerAtEndOf('a');
  assert.ok(corner, 'corner between a and b must exist');
  near(corner.point.x, 2500);
  near(corner.point.y, 0);
  near(corner.turnDeg, 90, TOL, 'interior turn is 90 deg');
  assert.ok(corner.bisector, 'bisector must be derived');
});

test('moving a wall endpoint moves the calculated corner', () => {
  const before = buildRoom(cornerRoom());
  near(before.cornerAtEndOf('a').point.x, 2500);

  // Wall B slides 300 mm along X. The corner MUST follow, because it is the
  // intersection of the two axis lines.
  const def = cornerRoom();
  def.walls[1].start.x = 2200;
  def.walls[1].end.x = 2200;
  def.walls[2].start.x = 2200;
  const after = buildRoom(def);

  near(after.cornerAtEndOf('a').point.x, 2200, TOL, 'corner follows wall B');
  near(after.cornerAtEndOf('a').point.y, 0);
});

test('walls that overshoot still produce one corner', () => {
  const def = cornerRoom();
  // Wall A runs 400 mm past the corner; wall B starts 400 mm before it.
  def.walls[0].end.x = 2900;
  def.walls[1].start.y = -400;
  const room = buildRoom(def);
  const corner = room.cornerAtEndOf('a');
  near(corner.point.x, 2500, TOL, 'corner stays at the axis crossing');
  near(corner.point.y, 0);
  // Wall A runs 400 mm past the corner: endGap is negative by exactly that much.
  near(corner.endGap, -400, TOL, 'overshoot is reported, not hidden');
  // Wall B starts 400 mm before the corner, so the corner is +400 along it.
  near(corner.startGap, 400, TOL, 'the next wall overshoots backwards');
});

test('parallel walls are rejected instead of silently producing a bogus corner', () => {
  assert.throws(
    () =>
      buildRoom({
        id: 'bad',
        walls: [
          { id: 'a', start: { x: 0, y: 0 }, end: { x: 1000, y: 0 } },
          { id: 'b', start: { x: 1000, y: 0 }, end: { x: 2000, y: 0 } },
          { id: 'c', start: { x: 2000, y: 0 }, end: { x: 0, y: 0 } },
        ],
      }),
    /parallel|zero area/i,
  );
});

test('a room needs at least three walls', () => {
  assert.throws(
    () => buildRoom({ id: 'x', walls: [{ id: 'a', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }] }),
    /at least 3 walls/,
  );
});

test('openings are stored wall-relative and derived into world space', () => {
  const room = buildRoom({
    ...cornerRoom(),
    openings: [
      { id: 'win', kind: 'window', wallId: 'c', offset: 400, width: 900, sillHeight: 900, headHeight: 2100 },
    ],
  });
  assert.equal(room.openings.length, 1);
  const o = room.openings[0];
  // Wall c runs (2500,1500) -> (0,1500), i.e. towards -X.
  near(o.start.x, 2100);
  near(o.start.y, 1500);
  near(o.end.x, 1200);
  near(o.end.y, 1500);
  assert.deepEqual(room.openingsOn('c').map((x) => x.id), ['win']);
  assert.deepEqual(room.openingsOn('a'), []);
});

test('a clockwise room flips every inward normal consistently', () => {
  const ccw = buildRoom(cornerRoom());
  const cwDef = cornerRoom();
  cwDef.walls.reverse();
  // Reversing the loop order also reverses each wall's direction.
  cwDef.walls = cwDef.walls.map((w) => ({ ...w, start: w.end, end: w.start }));
  const cw = buildRoom(cwDef);
  assert.equal(cw.orientation, 'cw');
  for (const w of cw.walls) {
    const same = ccw.wall(w.id);
    // The inward normal is a property of the room, not of the vertex order.
    near(w.inwardNormal.x, same.inwardNormal.x, TOL, `${w.id} inward X`);
    near(w.inwardNormal.y, same.inwardNormal.y, TOL, `${w.id} inward Y`);
  }
});
