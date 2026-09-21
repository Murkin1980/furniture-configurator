/**
 * Derived 3D scene data (CP-03).
 *
 * Pure data module: turns a buildProject() bundle into world-space boxes that
 * any renderer (Three.js page, tests, future exporters) can consume. It imports
 * NO renderer and holds NO dimensions of its own - part boxes come straight
 * from the parametric generators (part.box), wall/floor boxes from bundle.room.
 *
 * Every box is expressed twice, for convenience:
 *   - `basis` + `min`/`max`: the module/wall local frame (X along the wall
 *     direction, Y along the inward normal, Z up), suitable for building a
 *     transformed BoxGeometry;
 *   - `corners`: the same box as 8 world points (order: z, then y, then x).
 */

import { moduleTransform } from '../furniture/moduleGeometry.js';

/** 8 world corners of a local-space box under a module/wall transform. */
export function boxCorners(transform, box) {
  const corners = [];
  for (const z of [box.min.z, box.max.z]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const x of [box.min.x, box.max.x]) {
        corners.push({
          x:
            transform.origin.x +
            x * transform.direction.x +
            y * transform.inwardNormal.x,
          y:
            transform.origin.y +
            x * transform.direction.y +
            y * transform.inwardNormal.y,
          z,
        });
      }
    }
  }
  return corners;
}

const zBasis = () => ({ x: 0, y: 0, z: 1 });

/**
 * @param {object} bundle output of buildProject()
 * @returns {{units:string, floor:object, walls:Array, modules:Array, partCount:number}}
 */
export function sceneGraph(bundle) {
  const room = bundle.room;

  const modules = bundle.modules.map((m) => {
    const t = moduleTransform(room, m);
    // Derived Z elevation (CP-12) - read from the bundle, never re-derived.
    const bz = m.bottomZ ?? 0;
    const basis = {
      origin: { x: t.origin.x, y: t.origin.y, z: bz },
      x: { x: t.direction.x, y: t.direction.y, z: 0 },
      y: { x: t.inwardNormal.x, y: t.inwardNormal.y, z: 0 },
      z: zBasis(),
    };
    const parts = bundle.parts
      .filter((p) => p.moduleId === m.id && p.box)
      .map((p) => ({
        id: p.id,
        role: p.role,
        material: p.material,
        min: p.box.min,
        max: p.box.max,
        corners: boxCorners(t, p.box).map((c) => ({ ...c, z: c.z + bz })),
      }));
    return { id: m.id, wallId: m.wallId, basis, parts };
  });

  const walls = room.walls.map((w) => ({
    id: w.id,
    basis: {
      origin: { x: w.start.x, y: w.start.y, z: 0 },
      x: { x: w.direction.x, y: w.direction.y, z: 0 },
      y: { x: w.inwardNormal.x, y: w.inwardNormal.y, z: 0 },
      z: zBasis(),
    },
    min: { x: 0, y: -w.thickness / 2, z: 0 },
    max: { x: w.length, y: w.thickness / 2, z: room.height },
  }));

  const xs = room.walls.flatMap((w) => [w.start.x, w.end.x]);
  const ys = room.walls.flatMap((w) => [w.start.y, w.end.y]);
  const floor = {
    min: { x: Math.min(...xs), y: Math.min(...ys), z: -50 },
    max: { x: Math.max(...xs), y: Math.max(...ys), z: 0 },
  };

  return {
    units: 'mm',
    floor,
    walls,
    modules,
    partCount: bundle.parts.filter((p) => p.box).length,
  };
}
