# CP-08 Evidence Report

```
CP-08 RESULT: PASS (corner math test-verified against buildRoom; pointer gesture click-through is
manual - no headless browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-07):
cf6a921
SPEC:
docs/checkpoints/CP-08-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- model/roomedit.js: moveCorner(definition, cornerIndex, point, {snap90}). Rewrites only the shared
  endpoint of walls[i]/walls[i+1]. snap90 = Thales-circle projection => right angle at the corner.
- planSvg: corner dots carry data-corner (derived view otherwise unchanged).
- kernel-preview.html: dragging a red corner reshapes the room (Shift = snap to 90°), independent
  of module drag; errors surface in the existing #actionError line.
- tests: cp08-roomedit.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
loop closure + re-derived lengths:      PASS (corner 0 -> (2600,0); wall-a length re-derived 2600)
snap90 -> kernel-derived 90° corner:    PASS (Thales dot ~0; buildRoom turnDeg == 90 within 1e-6)
shrink rebuilds placement:              PASS (corner -> (2000,0) => wall-a 2000 => CANNOT_PLACE)
invalid index throws; deterministic:    PASS
CP-01..CP-07 suites unchanged:          PASS
legacy configurator unchanged:          PASS

TESTS
node --test: 116 tests, 116 pass, 0 fail

VERIFICATION BEYOND TESTS
- planSvg/roomedit/preview-inline all pass node --check; preview served 200 with the new h2 and
  data-corner dots (curl-verified).
- The 90° guarantee is proven by the kernel's own corner derivation (turnDeg), not asserted in the
  editor - the editor only constrains endpoints.

KNOWN LIMITATIONS / DEFERRED
- No add/remove of walls or openings during editing; no undo/redo/persistence (future checkpoint).
- The drag gesture needs a real browser (none in sandbox); moveCorner logic fully test-covered.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-09 - undo/redo + persistence (action-log replay via applyActions + localStorage/JSON round
trip), or openings editing (drag doors/windows on a wall). Do not start automatically.
```
