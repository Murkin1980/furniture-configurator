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
  placement/  layout, corner reservations, collision, occupancy; operations.js = CP-02 API
  bom/        parts -> BOM -> cutting summary (lower-bound sheet estimate only)
  validation/ codes (OVERLAP, OUT_OF_WALL, CANNOT_PLACE, CORNER_CONFLICT, RUN_GAP,
              OPENING_BLOCKED, UNKNOWN_WALL)
  model/      canonical model + buildProject/update*; runs.js = canonical runs normalisation;
              editor.js = CP-04 applyAction dispatcher over the placement API
  view/       planSvg.js (plan), isoSvg.js (isometric wireframe), scene3d.js (3D scene data,
              CP-03; renderer-free) + vendor/three.module.min.js (r160, for kernel-3d.html only)
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
               wallId?, wallOffset?, autoOffset?, parameters? } ],  // dims (wall via run or wallId)
  runs:  [ { wallId, startPoint:'start'|'end', moduleIds?:[ids] } ], // canonical ordered runs (CP-02)
  sheet: { sheetWidth, sheetHeight, kerf },                          // for the lower-bound estimate
}
```

Two equivalent definition styles are normalised to runs (model/runs.js): CP-02 style gives
`runs[].moduleIds` explicitly (modules carry only dimensions); CP-01 style lets modules carry
`wallId` and array order (runs derived by grouping). Normalisation never computes coordinates.

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
- `autoOffset` modules pack sequentially along their wall, **routing around the wall's openings
  (doors/windows) and the corner reservation at the end they pack from** (CP-02).
- `runs: [ { wallId, startPoint: 'start'|'end' } ]` selects each wall's fill direction (CP-02),
  mirroring GrabSketch's confirmed "Starting point" option. Default `'start'`.
- Corner reservation on a wall = the projected overlap of neighbouring walls' module footprints
  with this wall's cabinet strip (computed via convex clipping). This is what makes an L-corner
  non-colliding. The far end of a run is left free so the corner-owning run can close on the corner.
- A module that cannot fit is flagged `placementError: 'no-space'` and reported as `CANNOT_PLACE`.
- Usable wall length = wall length minus the derived corner reservations (`occupancy.usable`).

## Placement API (CP-02 §2)

placement/operations.js exposes deterministic mutations for a future drag-and-drop UI; each edits
only the canonical model and returns `{ definition, derived }` rebuilt by buildProject():

- `placeModule(def, module, { wallId, index })` - add to a run;
- `removeModule(def, id)`;
- `reorderModule(def, id, newIndex)` - move within its run;
- `moveModule(def, id, { wallId, index })` - move between runs;
- `rebuildProject(def)` - re-derive placement deterministically.

Invalid operations (unknown wall/module, out-of-range index) throw descriptive errors. The UI must
not own placement logic.

## 3D view (CP-03)

view/scene3d.js projects the bundle into world-space boxes (floor, walls, one box per part.box)
with NO renderer import; kernel-3d.html renders that data with a vendored Three.js (r160). The 3D
view is derived and read-only - plan, iso and 3D all read the same part boxes, so there is still no
second source of dimensions.

## Editing (CP-04)

model/editor.js exposes `applyAction(definition, action)` / `applyActions()`: add, remove, resize,
resizeWall, move (between runs), reorder - each dispatched through the CP-02 placement API and CP-01
update*. The debug preview's edit panel calls only applyAction; invalid actions throw descriptive
errors that the panel surfaces. The UI never computes placement.

## Run it

```
npm test                                   # node:test, 100 tests, zero deps
node src/kernel/tools/serve.js 8080        # static server
# open http://127.0.0.1:8080/kernel-preview.html   (debug preview)
# open http://127.0.0.1:8080/kernel-3d.html        (derived 3D view, CP-03)
# open http://127.0.0.1:8080/                    (existing configurator)
node src/kernel/tools/render-evidence.js   # regenerate docs/checkpoints/evidence/
```

## Out of scope (CP-01 §16)

Full catalogue, drag-and-drop editor, cutting optimiser, CNC, AI layout, accounts, backend. The
cutting "estimate" is an honest **lower bound** from area, not a nesting result.
