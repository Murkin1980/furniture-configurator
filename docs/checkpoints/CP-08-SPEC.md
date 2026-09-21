# CP-08 — Room-Shape Editing (Drag Corners, Shift-Snap 90°)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-07
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-07
> complete and no CP-08 spec on any branch. Mirrors GrabSketch's room editor (drag corners; Shift
> snaps to exactly 90°) while keeping the canonical flow. An owner spec supersedes this document.

## Goal

Let the user reshape the room by dragging wall junctions. The editor rewrites only wall endpoints;
corners, turn angles, corner reservations and placement all re-derive through buildRoom/
buildProject. With snap90 the drag is constrained so adjacent walls meet at exactly 90°.

## Required scope

1. `src/kernel/model/roomedit.js` - `moveCorner(definition, cornerIndex, point, {snap90})`. Free
   drag follows the pointer; snap90 projects onto the Thales circle over the two fixed neighbour
   endpoints so the corner is a right angle.
2. `planSvg` corner dots carry `data-corner` for hit-testing (no layout logic added).
3. `kernel-preview.html` - drag a red corner to reshape (Shift = snap); independent of module drag.
4. Tests `cp08-roomedit.test.js`: loop closure + re-derived lengths; snap90 yields kernel-derived
   turnDeg == 90; shrinking a wall rebuilds placement (CANNOT_PLACE); invalid index throws;
   determinism.
5. `docs/checkpoints/CP-08-EVIDENCE.md`.

## Explicitly out of scope

- adding/removing walls or openings while editing; non-rectilinear multi-corner constraints;
- undo/redo + persistence (separate future checkpoint);
- production editor polish (a11y, gestures); any CP-01..CP-07 behavior change.

## Acceptance criteria

- moveCorner keeps the wall loop closed and re-derives lengths;
- snap90 produces a kernel-derived 90° corner (turnDeg);
- a drag that shrinks a wall rebuilds placement with a clear validation error;
- 116 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-08. Do not start further checkpoints automatically.
