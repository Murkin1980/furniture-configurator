# CP-02 Evidence Report

```
CP-02 RESULT: PASS

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-01):
e67df5b  (CP-01 implementation commit)
SPEC:
docs/checkpoints/CP-02-SPEC.md (owner-authored, merged from origin)

WHAT WAS BUILT
- Canonical `runs` concept (model/runs.js): accepts CP-02 runs{wallId,moduleIds,startPoint}
  AND the CP-01 module.wallId style; normalises both, never storing coordinates.
- Placement API (placement/operations.js): placeModule, removeModule, reorderModule,
  moveModule; each edits only the canonical model and rebuilds via buildProject().
- Opening-aware + direction-aware packing (placement/placement.js): runs route around doors/
  windows and the pack-direction corner stand-off; `startPoint:'start'|'end'`.
- Corner model (derived): intersection, ownership, stand-off, and usable wall length
  (occupancy.usable); 560 is never hard-coded - it derives from module depth.
- Validation (validation/validate.js): OUT_OF_WALL, OVERLAP, CANNOT_PLACE, OPENING_BLOCKED,
  CORNER_CONFLICT, UNKNOWN_WALL + RUN_GAP warnings; deterministic and machine-readable.
- Derived preview (kernel-preview.html): fixture selector, runs/usable/reservation readout,
  hatched corner-reservation zones and red invalid modules; reads kernel result only.

ACCEPTANCE (spec §"Acceptance criteria") - proven by src/kernel/tests/cp02-spec.test.js
straight layout works:            PASS (offsets 0/800/1600)
L layout works:                   PASS (CP-01 fixture unchanged, same offsets)
P layout works:                   PASS (two parallel runs, no overlap)
modules do not overlap:           PASS (findOverlaps empty on all fixtures)
corner reservations derived:      PASS (560 comes from module depth; see derivation-report.json)
resizing a wall rebuilds:         PASS (shorten -> CANNOT_PLACE; lengthen -> usable grows)
resizing a module rebuilds:       PASS (a2 600->500 shifts a3/a4)
move/reorder deterministic:       PASS (same op twice -> identical modules; invalid ops throw)
invalid placements -> errors:     PASS (CANNOT_PLACE / CORNER_CONFLICT / unknown wall/module)
BOM derived from kernel:          PASS (CP-01 bom tests still pass)
CP-01 fixture still passes:       PASS
legacy configurator unchanged:    PASS (legacy VM tests still pass; index.html byte-identical)

TESTS
node --test: 85 tests, 85 pass, 0 fail
(CP-01 suites unchanged + cp02-placement.test.js + cp02-spec.test.js)

EVIDENCE ARTIFACTS (regenerate: node src/kernel/tools/render-evidence.js)
docs/checkpoints/evidence/plan-kitchen-2500x1500.svg   (corner reservations hatched)
docs/checkpoints/evidence/plan-kitchen-multirun.svg    (two runs; run routes around the door)
docs/checkpoints/evidence/derivation-report.json       (corners/reservations/occupancy/BOM)

KNOWN LIMITATIONS / DEFERRED
- Three.js / WebGL renderer deferred (spec out-of-scope; CDN also egress-blocked in sandbox).
- Corner stand-off arbitration packs from one end; a run whose corner is at its own far end and is
  owned by the opposite run relies on the fixed-point reservation loop (covered for L/P fixtures).

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-03 - attach a derived 3D (Three.js) renderer once multi-wall placement is stable. Do not start
automatically.
```
