# CP-04 Evidence Report

```
CP-04 RESULT: PASS (logic layer test-verified; in-browser click-through is manual - no headless
browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-03):
96377b9
SPEC:
docs/checkpoints/CP-04-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- model/editor.js: pure applyAction()/applyActions() dispatcher. Actions add/remove/resize/
  resizeWall/move/reorder, each routed through the CP-02 placement API + CP-01 update*.
  nextModuleId() generates collision-free ids (u1, u2, ...).
- kernel-preview.html: edit panel (add 600 cabinet, remove, move selected to wall, reorder left/
  right). The panel calls ONLY applyAction(); thrown errors are shown in #actionError. The page
  still computes nothing.
- tests: cp04-editor.test.js.
- docs/adr + src/kernel/README.md updated.

ACCEPTANCE (spec §"Acceptance criteria") - proven by src/kernel/tests/cp04-editor.test.js
edits rewrite only the canonical model:  PASS (every assertion reads buildProject() output)
add fits on a spare wall:                 PASS (straight 4000 -> offsets 0/800/1600/2400)
add on a full wall -> CANNOT_PLACE:       PASS (CP-01 wall-a)
resize shifts dependents:                 PASS (a2 600->500 => a3 1100, a4 1700)
remove repacks:                           PASS (remove a1 => a2 at 0)
reorder within run:                       PASS ([a1,a3,a2,a4]; a3 at 600)
move between runs round trip:             PASS (m3 a->c->a restores identical modules)
resizeWall rebuilds:                      PASS (wall-a 2400 => CANNOT_PLACE)
invalid actions throw:                    PASS (unknown module/wall, out-of-range, unknown type)
deterministic replay:                     PASS (applyActions twice -> identical JSON)

TESTS
node --test: 100 tests, 100 pass, 0 fail
(CP-01..CP-03 suites unchanged + cp04-editor.test.js)

VERIFICATION BEYOND TESTS
- kernel-preview.html inline module script passes node --check; page served 200 with the edit
  panel present (add/remove/move/reorder buttons + wall selector wired to applyAction).
- editor.js passes node --check; exported from src/kernel/index.js.

KNOWN LIMITATIONS / DEFERRED
- Debug-grade edits only: no pointer drag, undo/redo, or persistence (spec out of scope).
- Click-through of the panel requires a real browser (none in sandbox); the dispatched logic is
  fully covered by tests.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-05 - export pipeline (GLB from sceneGraph, and/or PDF/CSV cutting export) or pointer-based
drag between runs. Do not start automatically.
```
