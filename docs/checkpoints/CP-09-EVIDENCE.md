# CP-09 Evidence Report

```
CP-09 RESULT: PASS (journal logic test-verified; button click-through is manual - no headless
browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-08):
25d59d4
SPEC:
docs/checkpoints/CP-09-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- model/history.js: History = { base, actions, redo }; current() replays via applyActions();
  undo/redo pop/push; serializeHistory/deserializeHistory; applyAndRecord validates first.
- editor.js: applyAction accepts {type:'moveCorner'} so room edits are journaled.
- kernel-preview.html: undo/redo/save/load buttons; sliders, add/remove/move/reorder, module drag
  and corner drag all dispatch journaled actions; save/load via localStorage.
- tests: cp09-history.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
current == replay(base, actions):       PASS (undo restores base modules JSON; redo re-applies)
journal-only undo/redo/persistence:     PASS (no derived state stored; round-trip identical)
new action clears redo:                 PASS
empty undo/redo throw:                  PASS
moveCorner replayable via applyAction:  PASS (turnDeg == 90 after replay)
validate-before-record:                 PASS (invalid action throws, journal unchanged)
CP-01..CP-08 suites unchanged:          PASS
legacy configurator unchanged:          PASS

TESTS
node --test: 122 tests, 122 pass, 0 fail

VERIFICATION BEYOND TESTS
- history.js/editor.js and the preview inline module pass node --check; preview served 200 with
  undo/redo/save/load buttons (curl-verified).
- localStorage save/load needs a real browser (none in sandbox); serialize/deserialize is fully
  covered by the round-trip test.

KNOWN LIMITATIONS / DEFERRED
- No branching history/time-travel UI; no schema versioning of saved journals (out of scope).

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-10 - openings editing (drag doors/windows along a wall, resize) with automatic avoidance, or a
checklist panel (numeric ergonomics rules from GrabSketch help). Do not start automatically.
```
