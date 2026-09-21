# CP-02 Evidence Report

```
CP-02 RESULT: PASS

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
SPEC (source of truth):
docs/checkpoints/CP-02-SPEC.md (owner-authored)
CP-01 BASE:
e67df5b

WHAT WAS BUILT
- Canonical runs (model/runs.js): accepts runs{wallId, moduleIds, startPoint} and the CP-01
  module.wallId style; normalises both; never stores coordinates.
- Placement API (placement/operations.js): placeModule, removeModule, reorderModule, moveModule
  (between runs), rebuildProject; each edits only the canonical model and rebuilds via
  buildProject(); invalid ops throw descriptive errors.
- Opening-aware, direction-aware deterministic packing (placement/placement.js); usable wall
  length and corner reservations derived from module depth (560 never hard-coded).
- Validation (validation/validate.js): OUT_OF_WALL, OVERLAP, CANNOT_PLACE, CORNER_CONFLICT,
  OPENING_BLOCKED, UNKNOWN_WALL + RUN_GAP warnings; deterministic, machine-readable.
- Derived preview (kernel-preview.html + view/planSvg.js): walls; runs (green fill-direction
  arrows + labels); module IDs; hatched corner reservations; red invalid/collision modules;
  per-run usable/reserved readout. Reads kernel results only.

ACCEPTANCE (spec) -> PROVING TEST (src/kernel/tests/cp02-spec.test.js unless noted)
straight layout works:            'straight kitchen packs sequentially' (offsets 0/800/1600)
L layout works:                   'L-shaped kitchen still works' (CP-01 offsets unchanged)
P layout works:                   'P-shaped (two parallel runs) do not overlap'
modules do not overlap:           'all shipped fixtures build error-free and overlap-free'
corner reservations are derived:  derivation-report.json (reservations from module depth) +
                                  'explicit module in a corner reservation -> CORNER_CONFLICT'
resizing a wall rebuilds:         'resizing a wall rebuilds placement'
resizing a module rebuilds:       'resizing a module shifts dependent placement' (a3 1200->1100)
move/reorder deterministic:       'moving a module between runs is deterministic' +
                                  'place, reorder and remove are deterministic and validated'
invalid placements -> errors:     'a run wider than its wall reports CANNOT_PLACE' +
                                  'structural run errors are rejected' + invalid-op throws
BOM remains derived:              CP-01 bom suites (parts -> BOM -> totals) still green
CP-01 fixture still passes:       'L-shaped kitchen still works' + fixtures unchanged since e67df5b
legacy unchanged:                 legacy VM suites green; index.html & legacy src byte-identical
                                  since e67df5b (git diff e67df5b..HEAD on those paths is empty)
Fixture cases 1-8 (spec S6):      straight/L/P files + overflow/corner-conflict/move-between-runs/
                                  room-resize/module-resize tests, all present and green.

TESTS
Full suite today: node --test 128 pass / 0 fail (CP-03..CP-10 later added suites on top; the CP-02
subset above remains green and untouched in intent).

EVIDENCE ARTIFACTS (regenerate: node src/kernel/tools/render-evidence.js)
docs/checkpoints/evidence/plan-kitchen-2500x1500.svg   (reservations hatched; run arrows)
docs/checkpoints/evidence/plan-kitchen-2500x1500-a3-500.svg
docs/checkpoints/evidence/plan-kitchen-multirun.svg    (two runs; door routed; run arrows)
docs/checkpoints/evidence/plan-kitchen-straight.svg
docs/checkpoints/evidence/plan-kitchen-p.svg
docs/checkpoints/evidence/derivation-report.json       (corners/reservations/occupancy/BOM)

DEEP-CHANGE REQUIRED:
NO

NEXT (per spec):
STOP after CP-02. (Later owner-approved checkpoints CP-03..CP-10 were added afterwards on this
branch; they do not alter CP-01/CP-02 behavior.)
```
