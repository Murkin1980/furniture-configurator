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
              OPENING_BLOCKED, UNKNOWN_WALL); checklist.js = CP-11 derived ergonomics readouts
  model/      canonical model + buildProject/update*; runs.js = canonical runs normalisation;
              editor.js = CP-04 applyAction dispatcher; drop.js = CP-07 pointer-drop -> move action;
              roomedit.js = CP-08 drag corners (Shift-snap 90 deg);
              history.js = CP-09 undo/redo/persistence as action-log replay;
              openings.js = CP-10 slide/resize/add/remove doors & windows (wall-relative)
  view/       planSvg.js (plan), isoSvg.js (isometric wireframe), scene3d.js (3D scene data,
              CP-03; renderer-free), glb.js (binary glTF export, CP-05),
              cuttingPdf.js (cutting-list PDF, CP-06) + vendor/three.module.min.js (r160, for
              kernel-3d.html only)
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

## Drag between runs (CP-07)

model/drop.js maps a plan-view drop to a canonical action: nearestWall() projects the world point
onto the closest wall; dropAction() returns {type:'move', wallId, index} with the insertion index
taken from run-mates' derived wallOffsets. The preview's pointer layer only converts screen->world
and dispatches through applyAction(); planSvg polygons carry data-module for hit-testing.

## Room-shape editing (CP-08)

model/roomedit.js moveCorner() drags the shared endpoint of two consecutive walls; with snap90 the
pointer is projected onto the Thales circle over the fixed neighbours so the walls meet at exactly
90 deg (verified against buildRoom's derived turnDeg). Corners, angles, reservations and placement
all re-derive afterwards. planSvg corner dots carry data-corner for hit-testing.

## Undo/redo + persistence (CP-09)

model/history.js treats the project as { base, actions, redo }: the current model is ALWAYS
re-derived by replaying the journal through applyActions(). undo/redo are journal pops/pushes;
persistence is serialize/deserialize of the journal (the preview uses localStorage). Every UI edit -
resize, add/remove, move/reorder, drag, corner drag - is one action, so all of it is undoable and
replayable. applyAction also accepts {type:'moveCorner'} so room edits join the journal.

## Openings editing (CP-10)

model/openings.js slides/resizes/adds/removes doors & windows, rewriting only wall-relative fields
(offset/width) with clamping; wall length is derived from endpoints. applyAction accepts the four
opening actions so they join the journal. Because placement packs around blocked intervals, sliding
a door makes the affected run re-pack automatically (verified on the multirun fixture).

## Checklist (CP-11)

validation/checklist.js derives GrabSketch-style ergonomics readouts from the bundle: fits-room,
no-gaps, base-depth >=560, top-depth 300-400, corner-facade >=500 (declared corner cabinets only),
worktop-height 850-920, sink as 'na' when unmodelled. Read-only; the preview renders pass/fail/na.
Since CP-12 worktop-height is a real pass/fail (derived from the worktop model) and top-depth is
measured from the wall-cabinet generator; sink-width stays 'na' until a sink module exists.

## Vertical model (CP-12)

model/installation.js is the ONE kernel-owned place for the vertical kitchen. The canonical project
carries `installation: { plinthHeight: 100, worktopThickness: 38 }` (defaults live in
DEFAULT_INSTALLATION). buildProject() derives, and never re-stores, each placed module's elevation:
base/tall cabinets ride the plinth (bottomZ = plinthHeight), wall cabinets hang at their explicit
`parameters.mountHeight` anchor (a missing anchor is a WALL_CABINET_NO_ANCHOR issue, not a guess).
A base run yields one derived worktop whose top = plinthHeight + cabinet height + worktopThickness;
uneven base heights make the run unlevel (WORKTOP_UNLEVEL) and a module above the room ceiling is
MODULE_ABOVE_ROOM. furniture/cabinet.js gained real wall-cabinet and tall-cabinet generators in the
same MODULE_GENERATORS registry as base cabinets, so parts/BOM/3D/GLB/iso all flow unchanged. The
views read `module.bottomZ` for the Z offset - no renderer or export re-derives the formula.

## Auto blind-corner cabinet (CP-13)

A base cabinet can declare `parameters.corner = { kind:'blind', auto:true, clearance:0 }`.
placement/blindCorner.js then derives, AFTER XY placement and BEFORE parts, which room corner the
cabinet owns (geometrically, via cornerOccupancy - either wall end, reversed runs included), the
neighbouring run's depth, and the accessible facade:

    blindWidth  = adjacentDepth + clearance
    facadeWidth = ownerWidth - blindWidth        (no 560 constant anywhere)

The derived facadeWidth is attached as `module.cornerDerived` (never journaled - recomputed each
build) and is the SINGLE facade dimension used by the generator, BOM, 3D/GLB, iso and the CP-11
corner-facade checklist (which no longer uses module.width). Undeclarable corners raise stable
validation codes: CORNER_OWNER_INVALID, CORNER_ANGLE_UNSUPPORTED, CORNER_NEIGHBOR_MISSING,
CORNER_FACADE_INVALID. Non-corner cabinets are untouched.

## Export (CP-05)

view/glb.js exports binary glTF 2.0 straight from sceneGraph(): one TRS node per box over a shared
unit-cube mesh (parts + walls + floor), 3 simple materials. `exportGlb(bundle)` is deterministic and
dependency-free; kernel-3d.html offers "download GLB". The GLB opens in three's GLTFLoader/Blender.
Importing GLB back into the canonical model is deliberately out of scope (the model stays authored).

## Cutting PDF (CP-06)

view/cuttingPdf.js emits a printable cutting list (part id, material, L/W/T, grain, edge flags, qty,
totals) straight from bundle.parts as a deterministic PDF 1.4 - the paper half of GrabSketch's
cutting output; the CSV half ships since CP-01. kernel-preview.html offers "download cutting PDF".

## Run it

```
npm test                                   # node:test, 167 tests, zero deps
node src/kernel/tools/serve.js 8080        # static server
# open http://127.0.0.1:8080/kernel-preview.html   (debug preview)
# open http://127.0.0.1:8080/kernel-3d.html        (derived 3D view, CP-03)
# open http://127.0.0.1:8080/                    (existing configurator)
node src/kernel/tools/render-evidence.js   # regenerate docs/checkpoints/evidence/
```

## Out of scope (CP-01 §16)

Full catalogue, drag-and-drop editor, cutting optimiser, CNC, AI layout, accounts, backend. The
cutting "estimate" is an honest **lower bound** from area, not a nesting result.
