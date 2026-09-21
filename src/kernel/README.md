# Furniture kernel (CP-01)

A deterministic, dependency-free parametric furniture kernel. It proves, inside this repository,
that one canonical model can yield room geometry, a computed 90° corner, wall-relative placement,
one parametric base cabinet and its manufacturing parts — without any AI and without the renderer
being a source of truth.

## One-way flow (critical invariant)

```
Canonical Project Model
        |
        v
Parametric Furniture Kernel  (buildProject)
        |
  +-----+------+-----------+
  v            v           v
View/SVG    BOM/Parts   Validation
```

`buildProject()` (model/project.js) is the only place the flow runs. The views read
`room`/`moduleFootprint`/`part.box`; the BOM aggregates the generator's parts; validation reads the
same bundle. Nothing downstream stores a dimension.

## Directory map

```
src/kernel/
  geometry/   vec2, line/polygon intersection, SAT overlap, wall math (all derived)
  room/       buildRoom: walls -> corners (line intersection), inward normals, openings
  furniture/  cabinet.js (parametric parts + boxes), moduleGeometry.js (offset -> world)
  placement/  layout, corner reservations, collision, occupancy
  bom/        parts -> BOM -> cutting summary (lower-bound sheet estimate only)
  validation/ issue codes (OVERLAP, OUT_OF_WALL, RUN_GAP, OPENING_BLOCKED, UNKNOWN_WALL)
  model/      canonical model + buildProject/updateModule/updateWall
  view/       planSvg.js (plan), isoSvg.js (isometric wireframe)
  tools/      serve.js (static server), render-evidence.js (artifact generator)
  tests/      node:test suites incl. the 10-point fixture acceptance
```

## Canonical schema (stored inputs only)

```js
Project {
  id, name, units: 'mm',
  room: {
    id, height,
    walls:    [ { id, start:{x,y}, end:{x,y}, thickness } ],        // closed loop, in order
    openings: [ { id, kind:'door'|'window', wallId, offset, width,
                  sillHeight, headHeight } ],                       // wall-relative, not world
  },
  modules: [ { id, type:'base-cabinet', width, height, depth,
               wallId, wallOffset?, autoOffset?, parameters? } ],   // wall-relative placement
  sheet: { sheetWidth, sheetHeight, kerf },                          // for the lower-bound estimate
}
```

Everything else is derived (never authored): wall direction/length/angle/inwardNormal, corner
points (line intersection of wall axes), module world transforms/footprints, parts, BOM lines,
cutting groups, validation issues, corner occupancy, run occupancy.

## Parts (per base cabinet)

`side-left`, `side-right`, `bottom`, `rail-top`, `facade`. Each part carries BOTH a manufacturing
cut (`length`, `width`, `thickness`, `material`, `grain`, `edges{4 sides}`) and a 3D `box`
(`min/max` in the module-local frame: X = width, Y = depth back→front, Z = height). The view and
the BOM read the same numbers.

## Placement model

- A module stands on a wall: back edge on the wall axis, extending along the wall's inward normal
  by `depth`, oriented to the wall angle. No module stores world X/Y.
- `autoOffset` modules pack sequentially along their wall from the first corner reservation.
- Corner reservation on a wall = the projected overlap of neighbouring walls' module footprints
  with this wall's cabinet strip (computed via convex clipping). This is what makes an L-corner
  non-colliding.

## Run it

```
npm test                                   # node:test, 68 tests, zero deps
node src/kernel/tools/serve.js 8080        # static server
# open http://127.0.0.1:8080/kernel-preview.html   (debug preview)
# open http://127.0.0.1:8080/                    (existing configurator)
node src/kernel/tools/render-evidence.js   # regenerate docs/checkpoints/evidence/
```

## Out of scope (CP-01 §16)

Full catalogue, drag-and-drop editor, cutting optimiser, CNC, AI layout, accounts, backend. The
cutting "estimate" is an honest **lower bound** from area, not a nesting result.
