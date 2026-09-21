# CP-12 Evidence Report

```
CP-12 RESULT: PASS (vertical model test-verified; preview render click-through is manual - no
headless browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-11 + CP-12 spec):
871a7b8 (CP-11) + 3375b32 (owner CP-12-SPEC)
SPEC:
docs/checkpoints/CP-12-SPEC.md (owner-authored; source of truth)

WHAT WAS BUILT
- model/installation.js (NEW): the ONE kernel-owned vertical source. DEFAULT_INSTALLATION
  {plinthHeight:100, worktopThickness:38}; normalizeInstallation(); installationValid();
  moduleElevation(installation, module); worktopTopZ(installation, module).
- furniture/cabinet.js: real wall-cabinet + tall-cabinet generators added to the SAME
  MODULE_GENERATORS registry as base-cabinet (carcassParts helper; shelves from parameters).
- model/project.js: buildProject() derives installation, attaches bottomZ/topZ to every placed
  module, derives one worktop per base run, and returns installation + worktops in the bundle.
- validation/validate.js: (room, modules, opts) + codes VERTICAL_PARAM_INVALID,
  WALL_CABINET_NO_ANCHOR, MODULE_ABOVE_ROOM, WORKTOP_UNLEVEL.
- validation/checklist.js: worktop-height is now a real pass/fail from bundle.worktops (850-920);
  top-depth is measured from the wall-cabinet generator.
- view/scene3d.js + view/isoSvg.js: read module.bottomZ for the Z offset (glb.js inherits it via
  the scene graph). No renderer/export re-derives the elevation.
- fixtures/kitchen-vertical/project.json (NEW): base + wall (mountHeight 1400) + tall, installation.
- kernel-preview.html: "Vertical (CP-12)" readout (type, bottom/top Z, plinth, worktop thickness,
  derived worktop top, level) + the vertical fixture in the dropdown.
- src/kernel/tools/render-evidence.js: emits iso/scene/glb/vertical-report for the vertical fixture.
- tests: cp12-vertical.test.js (19 tests). README + ADR CP-12 addendum.

DERIVED NUMBERS (from vertical-report.json, regenerated this checkpoint)
installation:            plinth 100, worktop 38
elevations:              v1 100..820  v2 100..820  t1 100..2200  w1 1400..2120  w2 1400..2120
worktop (wall-a):        top 858 (= 100 + 720 + 38), level
checklist:               worktop-height=pass  top-depth=pass  base-depth=pass  fits-room=pass
                         corner-facade=na  sink-width=na  (no-gaps=fail: fixture is a partial run)

ACCEPTANCE (spec "Acceptance criteria")
all pre-CP-12 tests still pass:        PASS (134 prior suites green; 3 updated for derived Z)
three types via one registry:          PASS (MODULE_GENERATORS = base/wall/tall; cp12 test 1)
no renderer/export vertical formula:   PASS (scene3d/isoSvg/glb/cuttingPdf free of plinth/worktop
                                       math; read bottomZ - cp12 test 2)
one deterministic worktop elevation:   PASS (858; double-build identical - cp12 test 3)
CP-11 worktop-height no longer na:     PASS (CP-01 -> pass at 858 - cp12 test 4)
CP-11 top-depth via real wall cabinet: PASS (350 deep -> pass - cp12 test 5)
invalid arrangements -> issues:        PASS (WALL_CABINET_NO_ANCHOR, MODULE_ABOVE_ROOM,
                                       WORKTOP_UNLEVEL, VERTICAL_PARAM_INVALID - cp12 tests 6,86)
BOM derived from generator parts:      PASS (wall + tall parts reach the BOM - cp12 test 7)
undo/redo/persistence preserve model:  PASS (history + serialize round-trip - cp12 test 8)
legacy configurator unchanged:         PASS (only kernel-preview.html extended, as the spec allows)
evidence regenerated deterministically:PASS (render-evidence.js double-run md5 identical)
clean working tree after commit:       PASS (see commit)

FIXTURES / TESTS (spec 14-item list) - all covered in cp12-vertical.test.js
1 base default plinth/worktop          test 11 + 3/9
2 base custom plinth/worktop           test 15 (120/40 -> top 880)
3 wall cabinet at explicit mount       test 9 (w1 bottomZ 1400)
4 tall/pantry cabinet                  test 9 (t1 100..2200)
5 wall depth 300-400 -> pass           test 5
6 invalid wall depth -> fail           test 16 (250 -> top-depth fail)
7 worktop top 850-920 -> pass          test 4 (CP-01 858)
8 worktop top outside -> fail          test 4 (900 base -> 1038 fail)
9 inconsistent base heights -> issue   test (WORKTOP_UNLEVEL, level=false, topZ=null)
10 module above room height -> issue   test (MODULE_ABOVE_ROOM)
11 BOM includes wall/tall parts        test 7
12 3D/GLB same derived Z               tests 12 + 13
13 history serialize round-trip        test 8
14 deterministic rebuild/output        test 14

TESTS
node --test: 153 tests, 153 pass, 0 fail
  cp12-vertical.test.js: 19 tests, 19 pass

VERIFICATION BEYOND TESTS
- checklist.js, installation.js, render-evidence.js and the preview inline module pass node --check.
- render-evidence.js run twice: md5 of every file in docs/checkpoints/evidence/ identical
  (deterministic). New artifacts: iso-kitchen-vertical.svg, scene-kitchen-vertical.json,
  kitchen-vertical.glb, vertical-report.json.
- Preview render needs a real browser (none in sandbox); the vertical readout is derived-only and
  the underlying numbers are fully test-covered.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-13 - not started (owner directive: do not invent CP-13, do not continue automatically).
```
