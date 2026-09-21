# CP-05 — Export Pipeline (GLB from the Derived Scene)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-04
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-04
> complete and no CP-05 spec on any branch. Follows `CP-04-EVIDENCE.md`'s recommended next step
> ("export pipeline (GLB from sceneGraph ...)"). An owner spec supersedes this document.

## Goal

Prove the derived scene is consumable outside the repository's own views: export binary glTF 2.0
(GLB) straight from `sceneGraph()` so the kitchen opens in any glTF tool (three.js GLTFLoader,
Blender, online viewers). The exporter is a projection of derived data - it adds no dimensions and
never reads authored input the kernel doesn't already expose.

## Required scope

1. `src/kernel/view/glb.js` - dependency-free `exportGlb(bundle)` emitting a spec-compliant GLB
   (JSON + BIN chunks; one TRS node per box over a shared unit-cube mesh; 3 materials), plus
   `parseGlb(bytes)` for tests/debug.
2. Deterministic artifact `docs/checkpoints/evidence/kitchen-2500x1500.glb` via render-evidence.js.
3. `kernel-3d.html` gains "download GLB" (client-side Blob of `exportGlb(buildProject(def))`).
4. Tests `cp05-glb.test.js`: container well-formedness; node parity (parts + walls + floor);
   per-node TRS equal to `moduleTransform` math computed independently; byte determinism.
5. Out-of-band round-trip: parse the GLB with three's GLTFLoader (full npm package, /tmp) and
   verify node/mesh counts + a sample transform (recorded in evidence; not a committed test, to
   keep the repo dependency-free).
6. `docs/checkpoints/CP-05-EVIDENCE.md`.

## Explicitly out of scope

- textures/materials authoring, PDF/Excel cutting documents (CSV already exists from CP-01),
  Draco/meshopt compression, animations;
- GLB *import* into the kernel (the canonical model stays authored JSON, never derived-from-3D);
- any CP-01..CP-04 behavior change (all suites green; legacy byte-identical).

## Acceptance criteria

- exportGlb output parses with an independent glTF implementation (GLTFLoader) with
  nodes == parts + walls + floor;
- node transforms equal the kernel's own math;
- export is byte-deterministic;
- 104 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-05. Do not start further checkpoints automatically.
