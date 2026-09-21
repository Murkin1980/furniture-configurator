# CP-03 — Derived 3D View (Three.js)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01 Parametric Kernel, CP-02 Multi-Wall Placement
Implementation decision: EXTEND_EXISTING

> This scope was written by the Arena agent after the owner twice instructed "continue where you
> stopped" with CP-02 complete and no CP-03 spec on any branch. It follows the recommendation
> recorded in `CP-02-EVIDENCE.md` ("attach a derived 3D renderer once multi-wall placement is
> stable"). An owner-written spec, if one later appears, supersedes this document.

## Goal

Attach a read-only 3D renderer to the kernel. The 3D view is **derived data**: it consumes the
`buildProject()` bundle and must never own geometry, placement, or dimensions. The canonical flow
stays one-way:

```text
project model -> placement kernel -> geometry -> views (plan / iso / 3D) / BOM / validation
```

## Required scope

1. `src/kernel/view/scene3d.js` — pure, renderer-free projection of the bundle into world-space
   boxes (floor slab, wall boxes, one box per manufacturing part from `part.box`). No three import.
2. `kernel-3d.html` — debug page that renders `sceneGraph()` with Three.js: orbit (drag) + zoom
   (wheel), fixture selector shared with `kernel-preview.html`, module/part readout.
3. Vendored Three.js (`src/kernel/view/vendor/three.module.min.js`, r160, sha256 recorded in the
   vendor README) so the view works without any runtime CDN. The kernel core and all tests remain
   dependency-free.
4. Automated tests (`cp03-scene3d.test.js`) proving the scene data is faithful and deterministic:
   one box per BOM part; module envelope XY equals the plan footprint; corner modules do not
   interpenetrate in 3D; all boxes inside the room envelope; JSON-deterministic.
5. `docs/checkpoints/CP-03-EVIDENCE.md`.

## Explicitly out of scope

- editing/placement interaction in 3D (drag-and-drop stays a future checkpoint);
- GLB/export pipelines; materials/textures/pricing UI; lighting design;
- replacing the plan/iso views; React/Vue; a new repository;
- any change to CP-01/CP-02 behavior (all 91 prior+new tests must pass; legacy byte-identical).

## Acceptance criteria

- `sceneGraph()` part count equals BOM part count for every fixture;
- plan/iso/3D views all read the same `part.box` numbers (no second dimension source);
- corner-owning modules render as disjoint 3D boxes on the CP-01 fixture;
- kernel-3d.html loads offline (vendored module served from the repository);
- CP-01/CP-02 fixtures and legacy configurator unchanged;
- clean working tree after regenerating evidence.

## Stop condition

Stop after CP-03. Do not start drag-and-drop editing or export checkpoints automatically.
