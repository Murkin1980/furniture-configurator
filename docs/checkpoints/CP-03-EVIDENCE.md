# CP-03 Evidence Report

```
CP-03 RESULT: PASS (data/view layer; in-browser WebGL rasterization not verifiable in sandbox -
see KNOWN LIMITATIONS)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-02):
c945be6
SPEC:
docs/checkpoints/CP-03-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- view/scene3d.js: renderer-free scene graph. Floor slab, wall boxes, and one world box per
  manufacturing part, read straight from part.box via moduleTransform. No three import, no
  dimensions of its own.
- kernel-3d.html: derived read-only 3D view. Renders sceneGraph() with vendored Three.js; drag
  orbit + wheel zoom; fixture selector shared with kernel-preview.html; module/part/error readout.
- vendor/three.module.min.js: Three.js r160 vendored (sha256
  3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6) so the view needs no runtime
  CDN (CDN egress is blocked in the sandbox; the npm registry is not).
- kernel-preview.html links to the 3D view and back.
- render-evidence.js additionally writes docs/checkpoints/evidence/scene-kitchen-2500x1500.json.

ACCEPTANCE (spec §"Acceptance criteria") - proven by src/kernel/tests/cp03-scene3d.test.js
scene part count == BOM part count:   PASS (30 == 30 on the CP-01 fixture; asserted per fixture set)
plan/iso/3D read the same part.box:   PASS (envelope XY == moduleFootprint; iso/plan unchanged)
corner modules disjoint in 3D:        PASS (a4 vs b1 interiors do not intersect)
all boxes inside room envelope:       PASS (x/y within room bbox, z within [0, height])
kernel-3d.html loads offline:         PASS (page 200; vendored module served 200, 670681 bytes)
CP-01/CP-02 fixtures unchanged:       PASS (all prior suites green)
legacy configurator unchanged:        PASS (legacy VM tests green; index.html byte-identical)
deterministic scene graph:            PASS (JSON-equal across builds)

TESTS
node --test: 91 tests, 91 pass, 0 fail
(CP-01 + CP-02 suites unchanged + cp03-scene3d.test.js)

EVIDENCE ARTIFACTS (regenerate: node src/kernel/tools/render-evidence.js)
docs/checkpoints/evidence/scene-kitchen-2500x1500.json  (30 part boxes, 6 wall boxes, 6 modules)
plus all CP-01/CP-02 artifacts (plans, iso, bom csv, derivation-report.json)

VERIFICATION BEYOND TESTS
node imported the vendored three.module.min.js and executed the exact geometry path used by the
page (BoxGeometry + translate + applyMatrix4(basis)): 30 part geometries built from sceneGraph.
WebGLRenderer/PerspectiveCamera/HemisphereLight/MeshLambertMaterial all present in the module.

KNOWN LIMITATIONS / DEFERRED
- No headless browser in the sandbox: the final WebGL rasterization runs only in the user's
  browser. The data and geometry layers are test-verified; visual confirmation is manual.
- 3D is read-only: no editing, drag-and-drop, GLB export, materials, or pricing UI (out of scope).

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-04 - interactive editing (drag module between runs / resize) wired to the CP-02 placement API,
or an export pipeline (GLB/PDF). Do not start automatically.
```
