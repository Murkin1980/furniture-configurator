# CP-07 Evidence Report

```
CP-07 RESULT: PASS (drop logic test-verified; pointer gesture click-through is manual - no
headless browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-06):
3c3f159
SPEC:
docs/checkpoints/CP-07-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- model/drop.js: nearestWall(room, point) closest-wall projection (clamped to segments);
  dropAction(definition, moduleId, point) -> {type:'move', wallId, index} with insertion index from
  run-mates' derived wallOffsets.
- planSvg: module polygons carry data-module for hit-testing (derived view otherwise unchanged).
- kernel-preview.html: pointerdown on a module + pointerup anywhere -> dispatch(dropAction(...))
  through the CP-04 applyAction path; screen->world uses the plan viewBox mapping only.
- tests: cp07-drag.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
nearestWall projection + clamping:      PASS ((1250,150)->wall-a@1250; (2350,800)->wall-b@800;
                                         (-500,-200) clamps to wall-a@0)
cross-wall drop -> correct insertion:   PASS (b1 @ (1000,100) -> {move, wall-a, index 2};
                                         run becomes [a1,a2,b1,a3,a4])
same-wall drop is reorder:              PASS (a4 @ (300,50) -> index 1 -> [a1,a4,a2,a3])
determinism + unknown module throws:    PASS
applying the action rebuilds runs:      PASS (order asserted via applyAction)
CP-01..CP-06 suites unchanged:          PASS
legacy configurator unchanged:          PASS

TESTS
node --test: 112 tests, 112 pass, 0 fail

VERIFICATION BEYOND TESTS
- kernel-preview.html inline module passes node --check; page served 200; plan section announces
  drag; polygons expose data-module (curl-verified).
- The gesture itself needs a real browser (none in sandbox); the decision logic it feeds is fully
  covered by cp07-drag.test.js.

KNOWN LIMITATIONS / DEFERRED
- No drag ghost, touch multitouch, or a11y polish (debug-grade, spec out of scope).
- Room-shape (corner) editing remains a separate future checkpoint.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-08 - room-shape editing (drag corners with Shift-snap 90 deg) mirroring GrabSketch's room
editor, or undo/redo + persistence for the edit stack. Do not start automatically.
```
