# CP-09 — Undo/Redo + Persistence (Action-Log Replay)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-08
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-08
> complete and no CP-09 spec on any branch. Makes the editing surface reversible and durable using
> the journal that applyActions() was built for. An owner spec supersedes this document.

## Goal

Represent the project as an immutable base plus an ordered action journal. The current model is
always re-derived by replay; therefore undo/redo are pure journal operations and persistence is
just "save the journal". No derived state is ever stored, preserving the one-way flow.

## Required scope

1. `src/kernel/model/history.js` - `createHistory`, `pushAction`, `applyAndRecord`, `current`,
   `undo`, `redo`, `serializeHistory`, `deserializeHistory`.
2. `applyAction` accepts `{type:'moveCorner', cornerIndex, point, snap90}` so room edits join the
   journal like every other edit.
3. `kernel-preview.html` - undo/redo/save/load buttons; ALL edits (sliders, add/remove/move/
   reorder, module drag, corner drag) dispatch actions recorded in the journal; save/load use
   localStorage.
4. Tests `cp09-history.test.js`: undo restores base / redo re-applies; new action clears redo;
   empty-stack throws; moveCorner replayable; serialize/deserialize round-trip; validate-before-
   record.
5. `docs/checkpoints/CP-09-EVIDENCE.md`.

## Explicitly out of scope

- branching history / time-travel UI; collaborative editing; server persistence;
- migrating saved journals across schema changes (versioning);
- any CP-01..CP-08 behavior change (all suites green; legacy byte-identical).

## Acceptance criteria

- current() always equals replay(base, actions);
- undo/redo/persistence operate on the journal only (no derived state stored);
- every UI edit is undoable (single action);
- 122 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-09. Do not start further checkpoints automatically.
