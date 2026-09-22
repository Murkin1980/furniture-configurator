# CP-13 — Auto Blind-Corner Cabinet v1

Status: SPEC READY  
Repository: `Murkin1980/furniture-configurator`  
Branch: `arena/01a0c2ce-furniture-configurator`  
Depends on: CP-12  
Decision: EXTEND_EXISTING  
Deep-change: NO

## Scope-control rule

Implement CP-13 with the **minimum sufficient change**.

Before editing:
- read only the files needed for this checkpoint;
- follow existing call chains and project conventions;
- do not inspect the whole repository unless a failing test makes it necessary;
- if the direct implementation is clear, implement it immediately;
- do not redesign, generalize, refactor, rename, clean up, or document unrelated code "while here";
- reuse existing placement, cabinet generator, BOM, validation, checklist, history, views and export paths;
- add no new abstraction unless the existing code cannot express the required behavior cleanly.

After acceptance criteria pass:
- write CP-13 evidence;
- commit and push;
- verify clean tree;
- STOP.
Do not invent CP-14.

## Goal

Add one real **auto blind-corner base cabinet** to the existing kernel.

For a declared blind corner:

```js
parameters: {
  corner: {
    kind: 'blind',
    auto: true,
    clearance: 0
  }
}
```

derive from existing room/placement geometry:

```text
adjacentDepth = depth of the actual neighbouring run at this corner
blindWidth    = adjacentDepth + clearance
facadeWidth   = ownerCabinet.width - blindWidth
```

No hard-coded 560 mm rule and no duplicated neighbour depth in canonical input.

The same derived `facadeWidth` must feed:
- facade part;
- BOM;
- checklist;
- existing 3D/GLB path.

## Read first

Read only:
- `docs/checkpoints/CP-12-EVIDENCE.md`
- `src/kernel/placement/placement.js`
- `src/kernel/furniture/cabinet.js`
- `src/kernel/model/project.js`
- `src/kernel/validation/checklist.js`
- directly relevant corner tests/fixtures.

Read other files only if required by the actual call chain or a failing test.

Run the existing suite before edits. CP-12 baseline: **153/153**.

## Required behavior

### 1. Corner ownership

For `base-cabinet` modules with `parameters.corner.auto === true`:

- derive which existing room corner the module owns from actual placement/footprint geometry;
- support either wall end and reversed run direction;
- support only 90° blind corners in CP-13.

Keep derived data outside canonical project input. A compact derived structure is enough, e.g.:

```js
{
  cornerId,
  ownerWallId,
  adjacentWallId,
  blindSide,
  adjacentDepth,
  blindWidth,
  facadeWidth
}
```

Do not add fields that are not used by acceptance tests or downstream consumers.

### 2. Neighbour depth

Use the module/run that actually occupies or approaches the adjacent side of the same physical corner.

If no valid neighbour can be derived, return an explicit validation issue. Do not guess.

### 3. Facade

Keep the rectangular v1 carcass.

Only the corner cabinet facade changes:

- its manufactured width = derived `facadeWidth`;
- its part box uses the same value;
- existing BOM and 3D/GLB should receive that value through their current pipelines.

Do not add renderer-specific corner formulas.

Non-corner cabinets must remain unchanged.

### 4. Checklist

Replace the current corner-facade approximation:

- declared auto corner: use derived `facadeWidth`;
- `>= 500` => pass;
- `< 500` => fail;
- declared corner but derivation fails => validation issue / no fabricated pass;
- no declared corner => `na`.

### 5. Validation

Add only the validation codes actually needed for:

- corner module does not own/touch a corner;
- corner is not supported 90° geometry;
- adjacent neighbour is missing;
- derived facade width is non-positive.

Follow existing validation conventions. Do not build a new validation subsystem.

### 6. Editing/history

Existing resize/move/remove/history paths must cause normal rebuild and re-derivation.

Do not store `cornerDerived` in history or serialization.

### 7. Preview

Update the existing preview only if needed to inspect CP-13 output.

A simple derived readout is sufficient:
- owner module;
- adjacent depth;
- blind width;
- facade width;
- checklist result.

Do not redesign UI and do not add decorative visualization unless it is needed to debug a failing acceptance case.

## Required tests

Add only the tests needed to prove these cases:

1. owner width 1120 + adjacent depth 560 -> facade 560;
2. change adjacent depth to 600 -> facade 520;
3. owner width 1000 + adjacent depth 560 -> facade 440 and checklist fail;
4. ordinary base cabinet facade remains full width;
5. missing adjacent corner neighbour -> validation issue;
6. auto corner not actually at a corner -> validation issue;
7. reversed run direction gives the same physical result;
8. P-shape with two independent auto corners derives both correctly;
9. facade part and BOM use derived facade width;
10. existing 3D/GLB path uses the same facade part geometry;
11. resize/rebuild updates facade and checklist;
12. history/serialization stores only canonical inputs and reproduces derived result;
13. repeated build/evidence is deterministic.

Prefer extending an existing fixture/test when that is simpler than creating a new one.

Do not add tests for behavior outside this list unless required to protect an existing invariant that your code directly touches.

## Acceptance

CP-13 PASS requires:

- pre-CP-13 tests remain green;
- corner ownership is geometry-derived;
- neighbour depth is not duplicated canonically;
- no hard-coded 560 corner rule;
- one derived facade width reaches part/BOM/checklist/3D/GLB;
- neighbour-depth changes propagate after normal rebuild;
- reversed direction works;
- two P-shape corners work independently;
- invalid corner states are explicit;
- history stores no derived corner state;
- evidence is deterministic.

## Out of scope

Do not implement:
- diagonal/trapezoid/L-shaped corner carcasses;
- new placement engine;
- corner hardware;
- appliances/sink/cooktop;
- drawers;
- pricing;
- new export format;
- new repository;
- AI layout;
- production UI redesign;
- unrelated refactors.

## Deliverable

Create/update only what CP-13 needs, plus:
- `docs/checkpoints/CP-13-EVIDENCE.md`.

At completion:
1. run the full tests;
2. regenerate evidence twice if the existing checkpoint process requires generated evidence;
3. commit and push;
4. verify clean working tree;
5. STOP.
