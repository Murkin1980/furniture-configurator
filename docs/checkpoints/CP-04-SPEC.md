# CP-04 — Interactive Editing on the Placement API

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01, CP-02 (placement API), CP-03
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-03
> complete and no CP-04 spec on any branch. Follows `CP-03-EVIDENCE.md`'s recommended next step
> ("interactive editing wired to the CP-02 placement API"). An owner spec supersedes this document.

## Goal

Prove the CP-02 placement API is sufficient for a configurator UI: every user edit is expressed as
a small canonical-model **action** applied through `placeModule/removeModule/reorderModule/
moveModule/updateModule/updateWall`. The UI owns zero placement logic; all coordinates, BOM and
validation stay derived.

## Required scope

1. `src/kernel/model/editor.js` — pure `applyAction(definition, action)` / `applyActions()`
   dispatcher; actions: `add`, `remove`, `resize`, `resizeWall`, `move`, `reorder`. Invalid actions
   throw the API's descriptive errors verbatim.
2. `kernel-preview.html` gains an edit panel (add / remove / move-between-runs / reorder), driven
   exclusively by `applyAction`; errors from invalid edits are surfaced, not swallowed.
3. Tests `cp04-editor.test.js`: add (fits + full-wall CANNOT_PLACE), resize shift, remove repack,
   reorder, move-between-runs round trip, resizeWall rebuild, invalid-action throws, deterministic
   replay of an action sequence.
4. `docs/checkpoints/CP-04-EVIDENCE.md`.

## Explicitly out of scope

- production drag-and-drop (pointer gestures, undo/redo stacks, persistence) — debug-grade edits only;
- pricing/material UI; 3D editing; export pipelines; React/Vue; new repository;
- any CP-01/CP-02/CP-03 behavior change (all prior suites must stay green; legacy byte-identical).

## Acceptance criteria

- every edit rewrites only the canonical model; `buildProject()` re-derives the rest;
- invalid edits throw descriptive errors and the preview shows them;
- replaying the same action sequence yields identical definitions;
- 100 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-04. Do not start export/drag-and-drop checkpoints automatically.
