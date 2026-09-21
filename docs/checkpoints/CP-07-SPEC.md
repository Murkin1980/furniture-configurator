# CP-07 — Pointer Drag Between Runs

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-06
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-06
> complete and no CP-07 spec on any branch. Fulfils the "future drag-and-drop UI" the CP-02 spec
> anticipated, while keeping all placement logic in the kernel. An owner spec supersedes this.

## Goal

Let the user drag a module on the plan view and drop it on any wall; the gesture is translated into
a canonical `move` action. The pointer layer only converts screen -> world coordinates; the kernel
decides the resulting run/index from derived data, so the UI still owns no placement logic.

## Required scope

1. `src/kernel/model/drop.js` - pure `nearestWall(room, point)` (closest-wall projection, clamped)
   and `dropAction(definition, moduleId, point)` returning `{type:'move', wallId, index}` where the
   index is the insertion position among run-mates by derived wallOffset.
2. `planSvg` marks module polygons with `data-module` for hit-testing (no layout logic added).
3. `kernel-preview.html` - pointerdown on a module + pointerup anywhere dispatches
   `dropAction(...)` through the existing `applyAction` dispatcher; errors surface as before.
4. Tests `cp07-drag.test.js`: nearestWall projection/clamping; cross-wall drop yields the correct
   insertion index and run order; same-wall drop is a reorder; determinism; unknown module throws.
5. `docs/checkpoints/CP-07-EVIDENCE.md`.

## Explicitly out of scope

- drag ghost/ghost preview, touch multitouch, kinetic scrolling;
- dragging walls/corners (room-shape editing) - a separate future checkpoint;
- production drag-and-drop polish (a11y, undo); any CP-01..CP-06 behavior change.

## Acceptance criteria

- dropAction output equals the manual move/reorder a user intends (tested on CP-01 fixture);
- applying the returned action rebuilds runs correctly (order asserted);
- 112 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-07. Do not start further checkpoints automatically.
