# CP-10 — Openings Editing (Slide/Resize/Add/Remove Doors & Windows)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-09
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-09
> complete and no CP-10 spec on any branch. Completes the canonical editing surface (modules, room,
> openings). Openings stay wall-relative; placement keeps routing around them automatically.
> An owner spec supersedes this document.

## Goal

Let the user slide/resize/add/remove doors and windows on their wall. Edits rewrite only
wall-relative opening fields (offset/width) with clamping; the placement kernel re-routes runs
around them (blocked-interval packing + OPENING_BLOCKED), so automatic avoidance reacts to edits.

## Required scope

1. `src/kernel/model/openings.js` - `moveOpening`, `resizeOpening`, `addOpening`, `removeOpening`,
   `nextOpeningId`; all clamped to the wall; wall length derived from endpoints (raw walls store no
   length).
2. `applyAction` accepts `moveOpening/resizeOpening/addOpening/removeOpening` so opening edits join
   the CP-09 journal (undoable/persistable like every other edit).
3. `planSvg` opening lines carry `data-opening`; `kernel-preview.html` drags an opening along its
   own wall (center follows pointer).
4. Tests `cp10-openings.test.js`: baseline routing; sliding re-packs the run; move/resize clamp;
   remove closes the gap; add/remove round trip + validation; determinism.
5. `docs/checkpoints/CP-10-EVIDENCE.md`.

## Explicitly out of scope

- rotating openings onto another wall by drag (use add/remove instead);
- opening thickness/reveal, arches; window auto-sizing;
- any CP-01..CP-09 behavior change (all suites green; legacy byte-identical).

## Acceptance criteria

- sliding a door re-packs the affected run (automatic avoidance reacts);
- edits clamp within the wall; invalid ids/walls throw;
- opening edits are journaled (undoable/persistable);
- 128 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-10. Do not start further checkpoints automatically.
