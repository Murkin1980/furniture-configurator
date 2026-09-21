# CP-10 Evidence Report

```
CP-10 RESULT: PASS (opening logic test-verified; drag click-through is manual - no headless
browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-09):
43c8e2c
SPEC:
docs/checkpoints/CP-10-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- model/openings.js: moveOpening/resizeOpening/addOpening/removeOpening/nextOpeningId; wall-relative
  fields only, clamped; wall length derived from endpoints.
- editor.js: applyAction accepts the four opening actions -> journaled (undoable/persistable).
- planSvg: opening lines carry data-opening; preview drags an opening along its own wall.
- tests: cp10-openings.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
baseline routes around authored door:   PASS (wall-a offsets 0/600/2000)
sliding door re-packs run (avoidance):   PASS (door->0 => offsets 800/1400/2000)
move/resize clamp to wall:               PASS (offset -500->0; 99999->2200; width 5000->3000)
remove closes gap:                       PASS (offsets 0/600/1200)
add/remove round trip + validation:      PASS (window add/remove; ghost/nope throw)
opening edits journaled:                 PASS (applyAction cases; CP-09 journal replays them)
CP-01..CP-09 suites unchanged:           PASS
legacy configurator unchanged:           PASS

TESTS
node --test: 128 tests, 128 pass, 0 fail

VERIFICATION BEYOND TESTS
- openings.js/editor.js and the preview inline module pass node --check; preview served 200 with
  the updated h2 and data-opening lines (curl-verified).
- Drag gesture needs a real browser (none in sandbox); the slide/clamp/avoidance logic is fully
  test-covered.

KNOWN LIMITATIONS / DEFERRED
- Drag keeps an opening on its own wall (cross-wall via add/remove); no reveal/thickness editing.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-11 - checklist panel (GrabSketch numeric ergonomics rules: no gaps, worktop 850-920, plinth
80-150, base depth >=560, corner facade >=500/400, sink >=600) as derived validation readouts.
Do not start automatically.
```