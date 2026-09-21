# CP-13 — Auto Blind-Corner Cabinet v1

Status: SPEC READY  
Repository: `Murkin1980/furniture-configurator`  
Branch: `arena/01a0c2ce-furniture-configurator`  
Depends on: CP-12  
Implementation decision: EXTEND_EXISTING  
Deep-change required: NO

## Goal

Make the first real parametric corner cabinet in the existing kitchen kernel.

CP-13 must turn the current corner handling from "rectangular cabinet happens to occupy the corner" into an explicit, derived blind-corner cabinet model whose usable facade/return geometry is computed from the neighbouring run.

Primary outcome:

- a declared corner cabinet identifies the actual room corner it owns;
- the neighbouring run depth is derived from geometry, not typed twice;
- blind zone / return depth is derived from that neighbouring run;
- usable corner facade width is derived from cabinet width minus the blind zone;
- the derived facade dimension flows into parts, BOM, 3D/GLB, preview, validation, and CP-11 checklist;
- changing the neighbouring run depth automatically changes the corner facade everywhere.

No hard-coded 560 mm rule.

## Startup

Before changing code, read at minimum:

- `docs/checkpoints/CP-12-EVIDENCE.md`
- `src/kernel/README.md`
- `docs/adr/ADR-furniture-parametric-kernel.md`
- `src/kernel/placement/placement.js`
- `src/kernel/furniture/cabinet.js`
- `src/kernel/furniture/moduleGeometry.js`
- `src/kernel/model/project.js`
- `src/kernel/validation/checklist.js`
- current corner-related tests and fixtures.

Run the full existing suite first. CP-12 baseline is 153/153 and must remain green unless a test is intentionally updated to assert the stronger derived behaviour.

## Scope boundary

CP-13 v1 supports **blind 90° base-cabinet corners only**.

Do not add diagonal/trapezoid/L-shaped carcasses, magic-corner hardware, carousel hardware, sink cut-outs, or non-orthogonal corner design in this checkpoint.

A blind-corner cabinet may keep a rectangular carcass in v1. The new parametric behaviour is the derived blind zone + accessible facade and its propagation through the existing single-source pipeline.

## 1. Canonical input

Reuse the existing `base-cabinet` type.

Declare an auto blind corner through module parameters rather than inventing a separate parallel furniture engine.

Preferred canonical shape:

```js
parameters: {
  corner: {
    kind: 'blind',
    auto: true,
    clearance: 0
  }
}
```

Equivalent shape is acceptable if it preserves the same semantics.

Rules:

- `module.width` remains an authored overall cabinet width along its owner wall;
- `module.depth` remains its authored carcass depth;
- neighbouring-run depth is NOT authored on the corner module;
- facade width is NOT authored when `corner.auto === true`;
- corner world coordinates are never stored canonically.

Backward compatibility: existing truthy legacy `parameters.corner` fixtures/tests may be normalised if needed, but do not silently reinterpret unrelated data.

## 2. Identify the owned corner geometrically

After normal XY placement, derive which room corner the declared corner cabinet owns.

Use existing room/corner/footprint geometry and existing corner occupancy/reservation concepts. Do not make the renderer or UI decide ownership.

For each auto blind-corner cabinet derive at minimum:

```js
cornerDerived: {
  cornerId,
  ownerWallId,
  adjacentWallId,
  blindSide: 'start' | 'end',
  adjacentDepth,
  clearance,
  blindWidth,
  facadeWidth
}
```

Names may differ, but these facts must exist in one kernel-owned derived representation.

The implementation must work for either end of a wall and for reversed run direction. Do not assume every owner is at `wall.end`.

## 3. Derive neighbouring depth

For the same physical corner, inspect the placed modules on the adjacent wall.

Derive the depth that intrudes into/returns at the corner from the actual neighbouring run geometry.

For v1:

```text
blindWidth = adjacentDepth + clearance
facadeWidth = ownerCabinet.width - blindWidth
```

The key invariant is not the exact variable names; it is that `adjacentDepth` comes from the neighbouring placed run, not a duplicated value on the corner cabinet.

If multiple neighbouring modules could influence the same corner, use a deterministic geometry-based rule (e.g. the module actually occupying/approaching that corner or the maximum relevant overlapping depth). Document and test the chosen rule.

If there is no usable neighbouring run, return an explicit validation issue rather than guessing a depth.

## 4. Placement and dependency order

Do not replace the CP-02 placement engine.

The intended one-way dependency is:

```text
canonical project
  -> XY placement / room geometry
  -> derived corner geometry
  -> parts/BOM + validation/checklist + views/3D/export
```

If buildProject() must be reordered so corner derivation happens before parts generation, do the smallest safe refactor and document it.

Avoid circular dependencies: corner facade derivation may read placed footprints/reservations, but placement must not require the facade part to exist.

## 5. Corner cabinet parts

For a declared auto blind-corner base cabinet:

- keep the v1 rectangular carcass unless a smaller refactor is clearly required;
- generate the accessible facade from `cornerDerived.facadeWidth`, not from full module width;
- place that facade on the correct visible side according to `blindSide`;
- the facade manufacturing cut, BOM dimension, part.box, 3D scene and GLB must all use the same derived facade dimension.

Do not create a second facade size in view/export code.

Non-corner base cabinets must preserve CP-12 behaviour.

## 6. Checklist

Replace the CP-11 corner-facade approximation.

For an auto corner cabinet:

- read the actual derived `facadeWidth`;
- existing threshold remains `cornerFacadeMin = 500` unless the repository already has a newer owner rule;
- >= 500 => pass;
- < 500 => fail;
- declared auto corner whose geometry cannot be derived => fail/validation issue, not fabricated pass;
- no declared corner cabinet => `na`.

Do not use `module.width` as the corner-facade width.

## 7. Validation

Add stable machine-readable errors for at least:

- auto corner module does not actually own/touch a room corner;
- unsupported non-90° corner in v1;
- adjacent run/module needed for derivation is missing;
- derived facade width <= 0;
- derived facade below the checklist threshold remains a checklist fail (it does not necessarily have to block build unless the existing validation model treats this ergonomic rule as blocking).

Prefer dedicated codes such as:

- `CORNER_OWNER_INVALID`
- `CORNER_ANGLE_UNSUPPORTED`
- `CORNER_NEIGHBOR_MISSING`
- `CORNER_FACADE_INVALID`

Exact names may differ if repository conventions suggest better names.

## 8. Editing / history

Existing generic resize/move/reorder actions must automatically re-derive corner geometry.

Prove at minimum:

- resizing the adjacent module depth changes the corner facade;
- resizing the corner cabinet width changes its facade;
- moving/removing the adjacent corner-neighbour invalidates/re-derives correctly;
- undo/redo and persistence require no stored derived corner state.

Do not journal `cornerDerived`.

## 9. Views / preview

Extend the existing derived debug preview minimally.

Show for declared auto corners:

- owner module ID;
- corner;
- adjacent wall/module if available;
- adjacent depth;
- blind width;
- derived facade width;
- checklist result.

On the plan, visually distinguish the blind portion vs accessible facade only if this can be done from the derived bundle without new layout logic.

No production UI redesign.

## Fixtures and tests

Keep all previous fixtures/tests passing.

Add coverage for at least:

1. 90° blind corner with owner width 1120 and adjacent depth 560 -> derived facade 560;
2. change adjacent depth to 600 -> facade becomes 520 everywhere;
3. owner width 1000 + adjacent depth 560 -> facade 440 and corner-facade checklist fails;
4. non-corner base cabinet still has its full-width facade unchanged;
5. auto corner without adjacent run -> explicit validation issue;
6. auto corner not touching a corner -> explicit validation issue;
7. reversed wall/run direction derives the same physical result with correct `blindSide`;
8. P-shaped fixture with two independent auto corners derives both deterministically;
9. corner facade part/BOM cut equals derived facade width;
10. 3D scene/GLB part geometry uses the same derived facade width;
11. resize neighbour depth -> rebuild updates facade/BOM/checklist;
12. resize owner width -> rebuild updates facade/BOM/checklist;
13. undo/redo/serialize preserve only canonical inputs and reproduce the same derived corner state;
14. repeated build/evidence generation is deterministic.

The exact numerical fixtures may be adjusted only when geometry proves a different correct value; if changed, explain the geometry in CP-13-EVIDENCE rather than weakening the assertion.

## Acceptance criteria

CP-13 is PASS only if automated evidence proves:

- all pre-CP-13 behaviour remains green;
- corner ownership is derived from actual geometry;
- adjacent depth is taken from the neighbouring run, not duplicated;
- facade width is derived automatically;
- no 560 constant is embedded as a corner rule;
- facade part, BOM, checklist, 3D and GLB agree on one derived facade width;
- adjacent depth changes propagate everywhere from one edit;
- reversed run direction works;
- two-corner P layout works independently;
- invalid/unsupported corner states produce explicit validation evidence;
- history/persistence stores no derived corner geometry;
- evidence is deterministic;
- working tree is clean after the final pushed commit.

## Explicitly out of scope

Do not add in CP-13:

- separate repository;
- new placement engine;
- AI/LLM layout;
- diagonal corner cabinet;
- trapezoid corner cabinet;
- L-shaped physical carcass;
- corner hardware/catalogues;
- sink/cooktop cut-outs;
- appliance rules;
- drawers;
- pricing;
- production UI redesign.

Those are later checkpoints.

## Deliverables

Required:

- kernel-owned auto blind-corner derivation;
- base-cabinet facade integration using derived width;
- checklist + validation integration;
- derived preview readout;
- fixtures/tests including P-shaped two-corner case;
- deterministic evidence;
- README/ADR updates if dependency order/schema is changed;
- `docs/checkpoints/CP-13-EVIDENCE.md`.

At completion:

1. run the complete test suite;
2. regenerate evidence twice and prove determinism;
3. commit and push;
4. prove a clean working tree;
5. STOP.

Do not invent or start CP-14 automatically.
