# ADR — Furniture Parametric Kernel (CP-01)

**Status:** Accepted · **Date:** 2026-09-21 · **Scope:** `Murkin1980/furniture-configurator`
**Decision:** `EXTEND_EXISTING` — add an isolated, dependency-free kernel to this repository.

## Context

CP-01 must prove, inside the existing repository, the smallest deterministic furniture kernel:
one canonical model that correctly yields room geometry, a computed 90° corner, wall-relative
module placement, one parametric cabinet and its manufacturing parts, for the 2500×1500
L-shaped Salamat kitchen. It must not break the existing image/config configurator and must not
introduce heavyweight infrastructure (CP-01 §16, §21).

Forensics (see `docs/research/grabsketch-technical-reverse-engineering.md`) show GrabSketch is
Next.js + a real-time WebGL engine fanning one canonical model out to view/BOM/price. The lesson
to reproduce is the **architecture** (one-way derivation), not the stack.

## Decision

| Concern | Choice | Why |
|---|---|---|
| Language / runtime | Vanilla **ES Modules**, zero dependencies | The repo has no bundler and no deps. ESM works in the browser (preview) and in Node (`node --test`) with no build step. |
| Geometry primitives | 2D plan vectors; wall math derived from endpoints | Wall = `{id,start,end}` only; direction/length/angle/normals computed. Prevents duplicate dimensions (CP-01 §8). |
| 3D renderer | **Not Three.js for CP-01.** Derived SVG plan + isometric wireframe | The invariant to prove is "view is derived, not source of truth". A zero-dep SVG renderer proves that with the smallest surface and no second geometry representation. The kernel is renderer-agnostic (parts carry a `box`), so Three.js can be attached later without touching the model. |
| Canonical model | JSON: `Project → Room{walls,openings} + modules`; parts derived | Matches GrabSketch's confirmed shape and CP-01 §9; openings stored wall-relative, never world coords. |
| Placement | Wall coordinates (`wallOffset` + inward normal); auto-packed runs; **computed corner reservations**; SAT collision | Mirrors GrabSketch's confirmed sequential, non-overlapping runs and corner stand-off. No generalised optimiser (out of scope). |
| BOM / Part | Single parametric generator per module type; BOM aggregates generator output; view reads `part.box` | One derivation feeds BOM *and* view — the critical invariant. |
| Validation | Reads the same derived bundle; issues with codes/severities | Third consumer of the one-way flow. |
| Tests | `node:test`, deterministic, fixture-driven; 68 tests | Geometry correctness over snapshots (CP-01 §15). |

## Consequences

- New code lives only under `src/kernel/`, `fixtures/`, `docs/`, plus `kernel-preview.html` and a
  minimal `package.json` (`type: "module"`, scripts only, **no dependencies**).
- The existing configurator (`index.html`, `src/*.js`) is **byte-identical** to `master`; a
  VM-based test executes the legacy scripts to pin their behaviour (including a documented
  pre-existing `wardrobe` schema warning).

## Why no Three.js / no larger CAD stack (CP-01 §6, §21)

Three.js would add a dependency and, more dangerously, a second place where cabinet geometry is
expressed (meshes), inviting the exact violation CP-01 forbids (renderer holding its own
dimensions). CP-01 requires a *reproducible debug preview*, not photorealism; SVG wireframes
satisfy §14 (wireframe / basic colours / grid / dimension labels) with zero infrastructure. No
paid engine, Blender/SketchUp runtime, or backend is required for the kernel proof, so none is
added (deep-change gate not triggered).

## Compatibility with the current repository

- `index.html` unchanged → the shipped GitHub Pages site is unaffected.
- `package.json` `type:"module"` does not affect the classic `<script>` tags of the legacy app.
- The kernel can later be imported by product code via `src/kernel/index.js`.

## Risks / limitations

- SVG preview is a debug aid, not a polished 3D editor (out of scope).
- Corner reservations arbitrate L-corners via line intersection; a run packs from one end and
  leaves the far end free so the corner-owning run can close on the corner.

## CP-02 addendum (official spec: docs/checkpoints/CP-02-SPEC.md)

Multi-wall placement was added without new dependencies and without touching the one-way flow:

- Canonical `runs` = `{ wallId, startPoint, moduleIds }` (model/runs.js). Two equivalent definition
  styles normalise to runs; normalisation never computes coordinates.
- Placement API (placement/operations.js): `placeModule`, `removeModule`, `reorderModule`,
  `moveModule` (between runs), `rebuildProject` — each edits only the canonical model and returns
  `{ definition, derived }`. Invalid ops throw descriptive errors.
- Auto modules pack sequentially, routing around openings and the pack-direction corner stand-off;
  `startPoint` ('start' | 'end') mirrors GrabSketch's confirmed "Starting point" option.
- Corner reservations and usable wall length are derived from module depth (no hard-coded 560);
  `CORNER_CONFLICT` flags an explicit module placed inside a reserved zone; `CANNOT_PLACE` replaces
  silent overflow.
- Layouts proven by fixtures/tests: straight, L (CP-01), P, overflow, corner conflict,
  move-between-runs, room resize, module resize (`cp02-spec.test.js`, `cp02-placement.test.js`).
- Three.js remains deferred (CDN egress-blocked in the sandbox; zero-dependency ADR). The kernel
  stays renderer-agnostic, so a WebGL view can be attached later as a derived renderer.
- Evidence: `docs/checkpoints/CP-02-EVIDENCE.md` plus
  `docs/checkpoints/evidence/plan-kitchen-{straight,p,multirun,2500x1500}.svg`.

## CP-03 addendum (derived 3D view)

A read-only 3D renderer was attached without touching the one-way flow:

- `view/scene3d.js` is renderer-free: it re-exports `part.box` numbers as world-space boxes
  (floor slab, wall boxes, part boxes) using the same `moduleTransform` as the plan/iso views.
- `kernel-3d.html` consumes `sceneGraph()` with a **vendored** Three.js r160
  (`view/vendor/three.module.min.js`, sha256 recorded in the vendor README) because sandbox egress
  to CDNs is blocked while the npm registry is reachable. The kernel core and all tests remain
  dependency-free.
- 3D adds no interaction: placement/editing in 3D and export pipelines stay out of scope.
- Verified by `src/kernel/tests/cp03-scene3d.test.js` (part/box parity with the BOM, footprint
  consistency, 3D corner disjointness, room-envelope containment, determinism).

## CP-04 addendum (interactive editing on the placement API)

Editing proves the CP-02 API is UI-sufficient without giving the UI any placement logic:

- `model/editor.js` `applyAction(definition, action)` dispatches add/remove/resize/resizeWall/
  move/reorder through `placeModule/removeModule/reorderModule/moveModule/updateModule/updateWall`.
  It returns the next canonical definition; everything else is re-derived by buildProject().
- Invalid edits throw the API's descriptive errors; the preview panel surfaces them verbatim.
- `applyActions()` gives deterministic replay (basis for future undo/redo, which stays out of scope).
- Verified by `src/kernel/tests/cp04-editor.test.js` (100 tests total, all green).

## CP-05 addendum (GLB export of the derived scene)

The derived scene is consumable outside the repository's own views:

- `view/glb.js` `exportGlb(bundle)` emits spec-compliant binary glTF 2.0: JSON + BIN chunks, one
  TRS node per box (parts/walls/floor) over a shared unit-cube mesh, three simple materials.
  `parseGlb()` supports tests/debug. No new dimensions: node TRS is sceneGraph data.
- GLB import back into the canonical model stays out of scope - the model remains authored JSON,
  never derived from 3D (protects the one-way flow).
- Verified by `cp05-glb.test.js` (container, node parity, TRS vs moduleTransform, determinism) and
  out-of-band by parsing the committed artifact with three's GLTFLoader (37 meshes).

## CP-06 addendum (cutting-list PDF)

The manufacturing paper trail completes with a deterministic PDF 1.4 export:

- `view/cuttingPdf.js` lists every part (id, material, L/W/T, grain, edge flags, qty) plus totals,
  straight from bundle.parts; uncompressed streams, correct xref, ASCII-only (base-14 fonts carry
  no reliable Cyrillic), no dates -> byte-deterministic like other evidence.
- Verified in-suite (container/xref/table/determinism) and out-of-band by pdfjs-dist text
  extraction of the committed artifact.

## CP-07 addendum (pointer drag between runs)

Drag-and-drop completes the CP-02 promise of a UI-sufficient placement API without moving logic
into the view:

- `model/drop.js` nearestWall() projects a world point onto the nearest wall segment (clamped);
  dropAction() converts the drop into {type:'move', wallId, index} using run-mates' derived
  wallOffsets for the insertion index.
- The preview's pointer handlers only do screen->world conversion and call applyAction(); the
  kernel remains the single owner of placement.
- Verified by `cp07-drag.test.js` (projection, cross-wall insertion, same-wall reorder, throws).

## CP-08 addendum (room-shape editing, Shift-snap 90°)

The room itself becomes editable while staying canonical:

- `model/roomedit.js` moveCorner() rewrites only the two walls' shared endpoint. With snap90 the
  pointer is projected onto the Thales circle over the fixed neighbour endpoints, guaranteeing a
  right angle; buildRoom's derived turnDeg then reads exactly 90 (test-verified), so the snap is
  proven by the kernel's own corner math, not asserted in the editor.
- Editing stores no derived geometry; placement/reservations rebuild via buildProject().
- planSvg corner dots carry data-corner; the preview drags corners (Shift = snap) and modules.

## CP-09 addendum (undo/redo + persistence as action-log replay)

The edit story becomes durable and reversible without ever storing derived state:

- `model/history.js` History = { base, actions, redo }; current() replays the journal through
  applyActions(). undo/redo pop/push the journal; serialize/deserialize make the journal the whole
  project document (preview persists to localStorage).
- Every UI edit is a single action (resize/add/remove/move/reorder/drag/moveCorner), so the entire
  editing surface is undoable and replayable; applyAction gained {type:'moveCorner'}.
- Verified by `cp09-history.test.js` (undo/redo, redo-clear, empty throws, replayable corner edit,
  round-trip persistence, validate-before-record). 122 tests green.

## CP-10 addendum (openings editing)

The last canonical-editing surface (doors/windows) joins the journal:

- `model/openings.js` move/resize/add/remove openings, rewriting only wall-relative fields with
  clamping; wall length derived from endpoints (raw walls store none).
- applyAction accepts the four opening actions, so opening edits are undoable/persistable.
- Placement packs around blocked intervals, so sliding a door re-packs the run automatically
  (multirun fixture: door 1200->0 shifts wall-a offsets 0/600/2000 -> 800/1400/2000).
- Verified by `cp10-openings.test.js`; 128 tests green.
