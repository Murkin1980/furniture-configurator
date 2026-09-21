# CP-02 — Multi-run & Opening-aware Placement (continuation of CP-01)

**Status:** Implemented on `arena/01a0c2ce-furniture-configurator` · builds on CP-01 (PASS).
**Decision:** `EXTEND_EXISTING`, kernel-only, zero new dependencies.

## Goal

Extend the CP-01 kernel's placement engine from "single L-run with corner reservations" to the
behaviours GrabSketch confirms publicly, still deterministic and testable:

1. **Opening-aware placement** — a run must route around doors/windows on its own wall
   (GrabSketch: "the kitchen itself routes around them when placing cabinets").
2. **Run start point** — a run can fill from the left or the right end of a wall
   (GrabSketch: "Starting point" option).
3. **Multi-run rooms** — more than one wall carries a run in the same project (two-run / P-shape),
   with each run still honouring corner reservations and openings.
4. **No-space reporting** — when a run cannot fit, emit an explicit `CANNOT_PLACE` issue instead of
   silently overflowing the wall.

## Explicitly deferred (and why)

- **Three.js view.** The recommended CP-02 mentioned an optional Three.js view. It is deferred:
  the sandbox egress filter blocks the CDN builds of Three.js (jsdelivr/unpkg unreachable), so it
  could not be loaded or verified, and vendoring it would break the zero-dependency ADR. The kernel
  remains renderer-agnostic (parts carry `box`), so a Three.js view can be attached later without
  touching the model. The existing derived SVG preview continues to visualise multi-run rooms.

## Invariant preserved

CP-01's one-way flow is unchanged: `buildProject()` derives placement, view, BOM and validation
from the canonical model. Openings and start-point are canonical inputs; placements are derived.

## Acceptance (see `src/kernel/tests/cp02-*.test.js`)

- A run on a wall with a door splits around the door (offsets jump over the opening).
- `startPoint: 'end'` packs from the right end.
- A two-run (P-shape) project places both runs without overlap, honouring reservations.
- A run that cannot fit produces `CANNOT_PLACE`, not a silent overflow.
- All CP-01 tests still pass (no regression).
