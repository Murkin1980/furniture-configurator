# CP-12 — Kitchen Vertical System v1

Status: SPEC READY  
Repository: `Murkin1980/furniture-configurator`  
Branch: `arena/01a0c2ce-furniture-configurator`  
Depends on: CP-11  
Implementation decision: EXTEND_EXISTING  
Deep-change required: NO

## Goal

Extend the existing parametric kernel with the minimum vertical kitchen model needed for real kitchen work:

- base cabinets remain supported;
- wall cabinets become a real supported module type;
- tall/pantry cabinets become a real supported module type;
- plinth height and worktop thickness become canonical project inputs;
- vertical elevation/worktop height are derived from canonical data;
- CP-11 checklist items that can now be known must stop reporting fabricated `na`.

Do not create a second furniture engine. Reuse the existing module-generator registry, parts/BOM pipeline, placement kernel, action journal, 3D scene, GLB export, PDF export, SVG views, and validation flow.

Canonical direction remains:

```text
canonical project
  -> buildProject()
  -> placement + vertical derivation
  -> parts/BOM + validation/checklist + views/3D/export
```

## Startup

Before code changes, read at minimum:

- `docs/checkpoints/CP-11-EVIDENCE.md`
- `src/kernel/README.md`
- `docs/adr/ADR-furniture-parametric-kernel.md`
- `src/kernel/furniture/cabinet.js`
- `src/kernel/model/project.js`
- `src/kernel/validation/checklist.js`
- current 3D/export consumers that transform module-local part boxes.

Run the complete current test suite first. Preserve all previous checkpoint behaviour.

## Scope

### 1. Canonical vertical kitchen parameters

Add the smallest explicit project-level installation model required for kitchen vertical geometry.

Preferred shape:

```js
installation: {
  plinthHeight: 100,
  worktopThickness: 38
}
```

Equivalent naming is acceptable if it fits the existing model better.

Rules:

- these are source inputs;
- worktop top elevation is derived, not stored independently;
- do not duplicate worktop height in renderer/checklist/UI;
- default values may exist for backward compatibility, but they must live in one kernel-owned place and be documented.

For a base cabinet:

```text
cabinetBottomZ = plinthHeight
cabinetTopZ    = plinthHeight + cabinet.height
worktopTopZ    = cabinetTopZ + worktopThickness
```

If a run has base cabinets with incompatible top elevations, validation must report the inconsistency instead of silently inventing one worktop plane.

### 2. Module types

Support these canonical types through the existing generator registry:

- `base-cabinet`
- `wall-cabinet`
- `tall-cabinet`

Do not create parallel BOM/view implementations per type.

Refactor common carcass generation only if it reduces duplication without changing existing base-cabinet output.

Minimum manufacturing semantics:

#### wall-cabinet
Must generate a deterministic carcass and facade from module width/height/depth and shared panel/material parameters.

It must be a real generator, not only a label used by checklist.

#### tall-cabinet
Must generate a deterministic full-height carcass and facade from module width/height/depth and shared panel/material parameters.

Optional shelves are allowed only if represented by explicit parameters/defaults owned by the generator. Do not add speculative appliance logic in this checkpoint.

Existing `base-cabinet` parts/BOM output must remain backward-compatible unless a deliberate refactor proves byte/semantic equivalence in tests.

### 3. Vertical elevation

Add a kernel-owned way to derive each placed module's Z elevation.

Minimum rules:

- base cabinet: derived from project plinth height;
- tall cabinet: derived from project plinth height unless an existing architecture requires an explicit override;
- wall cabinet: requires an explicit canonical bottom elevation / mount elevation parameter, or another equally clear canonical vertical anchor.

Do not encode vertical position independently in SVG, Three.js, GLB, checklist, or preview.

Every 3D/export consumer must read the same derived elevation.

2D wall placement remains the existing CP-02 system; CP-12 must not rewrite XY placement.

### 4. Derived worktop model

Add a minimal derived worktop readout sufficient to answer:

- what is the worktop top elevation for each base run;
- whether the base run is level enough to support one worktop plane.

This checkpoint does **not** need to manufacture the countertop, cut sink holes, mitre corners, or add a countertop BOM part.

The derived worktop data must come from base modules + plinth + worktop thickness.

### 5. Checklist integration

Update CP-11 checklist honestly.

Required behaviour:

- `worktop-height` becomes `pass` or `fail` when a base run provides enough modeled data;
- use the existing 850–920 mm limit unless the repository documents a newer rule;
- `top-depth` becomes testable with real `wall-cabinet` modules;
- projects with no relevant modules may still return `na`;
- do not turn UNKNOWN into a guessed pass.

Keep sink/corner rules unchanged unless the new model directly provides the missing evidence.

### 6. Validation

Add machine-readable validation for at least:

- unsupported/invalid vertical parameters;
- wall cabinet missing/invalid vertical anchor;
- module exceeding room height after elevation is applied;
- incompatible base-module top elevations within one worktop-bearing run.

Use stable codes and deterministic messages.

Do not overload unrelated existing codes if a dedicated code is clearer.

### 7. Existing editors/history

The action journal must remain the source for edits.

If the existing generic module update action already supports type/elevation/parameters, reuse it.

Only add a new action if the current action contract genuinely cannot express the edit.

Undo/redo + serialize/deserialize must preserve the new canonical fields.

### 8. Derived views and exports

Update existing derived consumers only as needed so vertical positions are consistent:

- isometric/debug view;
- Three.js scene;
- GLB export;
- any other existing 3D representation.

No consumer may recalculate its own plinth/worktop elevation formula.

The plan view does not need new XY behaviour.

### 9. Preview

Extend the existing kernel preview minimally.

Show/read out:

- module type;
- derived bottom/top elevation;
- project plinth height;
- worktop thickness;
- derived worktop top height;
- checklist status.

Keep it a debug/editor preview, not a production UI redesign.

## Fixtures / tests

Keep every existing fixture and test passing.

Add minimum coverage for:

1. base cabinet with default plinth/worktop values;
2. base cabinet with custom plinth/worktop values;
3. valid wall cabinet at explicit mount elevation;
4. valid tall/pantry cabinet;
5. wall cabinet depth inside 300–400 => checklist pass;
6. invalid wall cabinet depth => checklist fail;
7. derived worktop top height inside 850–920 => pass;
8. derived worktop top height outside range => fail;
9. inconsistent base heights in one worktop run => validation issue;
10. elevated module exceeding room height => validation issue;
11. BOM includes wall/tall generated parts;
12. 3D/GLB uses the same derived Z elevation;
13. history serialize/deserialize round-trip preserves new canonical inputs;
14. deterministic rebuild/output.

## Acceptance criteria

CP-12 is PASS only when automated evidence proves:

- all pre-CP-12 tests still pass;
- three cabinet types are supported by the same generator registry/pipeline;
- no renderer/export owns an independent vertical formula;
- plinth + worktop inputs produce one deterministic derived worktop elevation;
- CP-11 `worktop-height` is no longer always `na`;
- CP-11 `top-depth` is exercised by a real wall-cabinet generator;
- invalid vertical arrangements generate explicit validation issues;
- BOM remains derived from generator parts;
- undo/redo/persistence preserve the new model;
- legacy configurator remains unchanged unless an existing kernel preview file is intentionally extended;
- evidence is regenerated deterministically;
- working tree is clean after the final commit.

## Explicitly out of scope

Do not add in CP-12:

- new repository;
- alternative kernel;
- AI/LLM layout;
- production UI redesign;
- drawer hardware systems;
- appliance-specific cabinet libraries;
- countertop manufacturing/cutting geometry;
- sink/cooktop cut-outs;
- plinth manufacturing BOM;
- pricing;
- cloud persistence;
- new export format.

These can be later checkpoints after the vertical model is stable.

## Deliverables

Required:

- vertical/install model implementation;
- wall-cabinet generator;
- tall-cabinet generator;
- derived module elevations/worktop readout;
- checklist + validation integration;
- updates to existing 3D/export consumers as required;
- fixtures/tests;
- minimal preview update;
- README/ADR updates if the canonical schema changes;
- `docs/checkpoints/CP-12-EVIDENCE.md`.

At completion, commit and push the checkpoint branch, prove a clean tree, then STOP.

Do not invent CP-13 and do not continue automatically.
