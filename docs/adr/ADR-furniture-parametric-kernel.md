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

## CP-02 addendum (continuation)

Multi-run + opening-aware placement were added without new dependencies and without touching the
one-way flow:

- Openings and the pack-direction corner stand-off are treated as blocked intervals; auto modules
  route around them (`nextFromLow` / `nextFromHigh`).
- `runs[].startPoint` ('start' | 'end') selects fill direction, mirroring GrabSketch's confirmed
  "Starting point" option.
- `CANNOT_PLACE` replaces silent overflow when a run cannot fit.
- Three.js remains deferred (CDN egress-blocked in the sandbox; zero-dependency ADR). The kernel
  stays renderer-agnostic, so a WebGL view can be attached later.
- Verified by `src/kernel/tests/cp02-placement.test.js` and
  `docs/checkpoints/evidence/plan-kitchen-multirun.svg`.
