# CP-02 — Multi-Wall Placement Kernel

Status: SPEC READY  
Repository: `Murkin1980/furniture-configurator`  
Depends on: CP-01 Parametric Kernel  
Implementation decision: EXTEND_EXISTING

## Goal

Extend the CP-01 parametric kernel from one L-shaped fixture into a reusable deterministic placement engine for straight, L-shaped, and P-shaped kitchens.

Do not create a second layout engine. Do not move geometry into UI code.

Canonical flow remains:

```text
project model -> placement kernel -> geometry -> views / BOM / validation
```

## Startup

Before changing code, read:

- `docs/checkpoints/CP-01-EVIDENCE.md`
- `src/kernel/README.md`
- `docs/adr/ADR-furniture-parametric-kernel.md`

Run the existing test suite and preserve all CP-01 behavior.

## Required scope

### 1. Multi-wall runs

Introduce a canonical concept of furniture `runs`.

Each run must reference a wall and contain an ordered set of module IDs. Placement must derive real coordinates from wall geometry, reservations, module dimensions, and run order.

Computed world coordinates are derived data, not source-of-truth input.

Minimum supported layouts:

- straight wall;
- L-shape;
- P-shape.

### 2. Placement API

Expose a small kernel API suitable for a future drag-and-drop UI.

Minimum capabilities:

- place module;
- move module;
- remove module;
- reorder module in the same run;
- move module between runs;
- rebuild placement deterministically.

Exact function names may differ if the existing architecture suggests cleaner names.

The UI must not own placement logic.

### 3. Deterministic auto-layout

Given the same canonical model, the kernel must always produce the same placement.

Rules:

- modules are packed sequentially inside a run;
- no module may exceed usable wall length;
- no module may occupy a reserved corner zone;
- modules may not overlap;
- resizing a module shifts/rebuilds dependent modules;
- resizing a wall rebuilds affected runs;
- run ordering must not introduce accidental nondeterminism.

Do not use AI/LLM placement in CP-02.

### 4. Corner model

Corners are derived geometry.

For intersecting walls, derive:

- wall intersection;
- corner ownership;
- reservation/stand-off on adjacent runs;
- usable wall length after reservations.

Do not hard-code the existing `560` value as a fixture-specific rule. A value such as 560 mm must come from module/corner parameters.

### 5. Validation

Return explicit validation results for at least:

- wall overflow;
- module overlap;
- corner reservation conflict;
- invalid run/wall reference;
- invalid move/reorder operation.

Validation output must be deterministic and machine-readable.

### 6. Fixtures

Keep the existing CP-01 fixture unchanged and passing.

Add fixtures/tests covering at minimum:

1. straight kitchen;
2. L-shaped kitchen;
3. P-shaped kitchen;
4. wall-width overflow;
5. corner conflict;
6. moving a module between runs;
7. room resize and regeneration;
8. module resize and regeneration.

### 7. Derived debug preview

Extend `kernel-preview.html` only as a derived debug view.

Show:

- walls;
- runs;
- module IDs;
- corner reservations;
- invalid/collision zones when present.

The preview must call/read the kernel result directly and must not calculate layout independently.

## Acceptance criteria

CP-02 is PASS only if automated tests prove:

- straight layout works;
- L layout works;
- P layout works;
- modules do not overlap;
- corner reservations are derived;
- resizing a wall rebuilds placement;
- resizing a module rebuilds subsequent placement;
- move/reorder operations are deterministic;
- invalid placements produce clear validation errors;
- BOM remains derived from canonical/kernel data;
- CP-01 fixture still passes;
- legacy configurator behavior remains unchanged.

Regenerate evidence deterministically and verify a clean working tree at the end.

## Explicitly out of scope

Do not add in CP-02:

- Three.js;
- Blender;
- SketchUp;
- CAD kernel;
- React/Vue rewrite;
- production drag-and-drop UI;
- pricing UI;
- material-selection UI;
- generative AI;
- a new repository.

3D is a later derived renderer after multi-wall placement is stable.

## Deliverables

Expected deliverables:

- kernel changes for multi-wall runs/placement;
- tests and fixtures;
- updated derived preview;
- `docs/checkpoints/CP-02-EVIDENCE.md`;
- deterministic evidence artifacts if needed.

Stop after CP-02. Do not start the 3D renderer checkpoint automatically.
