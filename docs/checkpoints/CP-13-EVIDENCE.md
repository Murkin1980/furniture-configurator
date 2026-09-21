# CP-13 Evidence Report

```
CP-13 RESULT: PASS (blind-corner derivation test-verified; preview render click-through is
manual - no headless browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-12 + owner CP-13 spec):
2f30f32 (CP-12) + e55fff2 (owner "docs: add CP-13 auto blind-corner cabinet specification")
SPEC:
docs/checkpoints/CP-13-SPEC.md (OWNER-authored; source of truth)

NOTE: an earlier agent-authored appliance CP-13 was discarded when the owner's official
CP-13-SPEC (auto blind-corner) was found on the remote; "appliance rules" are explicitly out of
scope there. The owner spec was restored and implemented.

WHAT WAS BUILT
- placement/blindCorner.js (NEW): deriveBlindCorners(room, modules). For each base cabinet with
  parameters.corner={kind:'blind',auto:true,clearance}, derives the owned room corner (via
  cornerOccupancy, either wall end, reversed runs), adjacentWallId, adjacentDepth (from the
  adjacent placed run), blindWidth = adjacentDepth + clearance, facadeWidth = width - blindWidth,
  blindSide. Stable error codes when underivable.
- model/project.js: buildProject() reordered so corner derivation runs AFTER placement and BEFORE
  parts; attaches module.cornerDerived (in-memory, recomputed, never journaled).
- furniture/cabinet.js: generateBaseCabinet builds the facade from cornerDerived.facadeWidth on the
  accessible side (carcass stays full width); non-corner cabinets unchanged.
- validation/checklist.js: corner-facade reads cornerDerived.facadeWidth (not module.width);
  legacy corner:true falls back to width.
- validation/validate.js: CORNER_OWNER_INVALID, CORNER_ANGLE_UNSUPPORTED, CORNER_NEIGHBOR_MISSING,
  CORNER_FACADE_INVALID.
- fixtures/kitchen-corner/project.json (NEW): owner c1 width 1120, adjacent run depth 560.
- kernel-preview.html: "Blind corners (CP-13)" readout (owner, corner, adjacent wall/module,
  adjacent depth, blind width, derived facade, blindSide) + fixture in the dropdown.
- render-evidence.js: emits iso-kitchen-corner.svg + corner-report.json.
- tests: cp13-blindcorner.test.js (14 tests). README + ADR CP-13 addendum.

DERIVED NUMBERS (from corner-report.json, regenerated this checkpoint)
c1: width 1120, corner wall-a__wall-b, adjacent wall-b/b1 depth 560, blindSide end,
    blindWidth 560, facadeWidth 560
facade parts: a1=1380 (full width, non-corner)  c1=560 (derived)  b1=600
checklist: corner-facade=pass  (no-gaps=fail: wall-b run is partial - fixture is a corner demo)

ACCEPTANCE (spec "Acceptance criteria")
all pre-CP-13 behaviour green:         PASS (153 prior tests unchanged)
corner ownership derived from geometry:PASS (cornerOccupancy; either end; reversed - cp13 1,7)
adjacent depth from neighbouring run:  PASS (not duplicated; 560->600 changes facade - cp13 1,2)
facade width derived automatically:    PASS (1120-560=560; no constant - cp13 1)
no 560 constant embedded:              PASS (facade tracks adjacent depth - cp13 2,11)
facade/BOM/checklist/3D/GLB agree:     PASS (one derived width - cp13 9,10)
adjacent depth change propagates:      PASS (one edit -> parts/BOM/checklist - cp13 11)
reversed run direction works:          PASS (blindSide start - cp13 7)
two-corner P layout independent:       PASS (560 and 520 - cp13 8)
invalid/unsupported -> validation:     PASS (NEIGHBOR_MISSING, OWNER_INVALID - cp13 5,6)
history stores no derived geometry:    PASS (serialized journal has no cornerDerived - cp13 13)
evidence deterministic:                PASS (render-evidence double-run md5 identical)
clean working tree after commit:       PASS (see commit)

FIXTURES / TESTS (spec 14-item list) - all in cp13-blindcorner.test.js
1 1120/560 -> 560            2 adj 600 -> 520 everywhere     3 1000/560 -> 440 + fail
4 non-corner full facade     5 no adjacent -> NEIGHBOR_MISSING 6 not touching -> OWNER_INVALID
7 reversed -> blindSide start 8 two corners 560 & 520        9 BOM cut == derived width
10 scene/GLB == derived      11 resize neighbour propagates  12 resize owner propagates
13 history/persistence canonical-only  14 deterministic

TESTS
node --test: 167 tests, 167 pass, 0 fail
  cp13-blindcorner.test.js: 14 tests, 14 pass

VERIFICATION BEYOND TESTS
- blindCorner.js, render-evidence.js and the preview inline module pass node --check.
- render-evidence.js run twice: md5 of every file in docs/checkpoints/evidence/ identical.
  New artifacts: iso-kitchen-corner.svg, corner-report.json.
- Preview render needs a real browser (none in sandbox); the readout is derived-only and the
  derivation is fully test-covered.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-14 - not started (owner directive: do not invent the next checkpoint, do not continue
automatically).
```
