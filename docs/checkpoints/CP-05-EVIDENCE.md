# CP-05 Evidence Report

```
CP-05 RESULT: PASS

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-04):
ff01b7f
SPEC:
docs/checkpoints/CP-05-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- view/glb.js: dependency-free binary glTF 2.0 exporter. exportGlb(bundle) -> Uint8Array:
  JSON + BIN chunks, shared 24-vertex unit-cube mesh, one TRS node per box
  (30 parts + 6 walls + 1 floor on the CP-01 fixture), 3 pbr materials; parseGlb() for tests.
- kernel-3d.html: "download GLB" button (client Blob of exportGlb(buildProject(def))).
- render-evidence.js writes docs/checkpoints/evidence/kitchen-2500x1500.glb (6168 bytes).
- tests: cp05-glb.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
independent glTF parse (GLTFLoader):   PASS - committed artifact parses; 37 meshes
                                        (30 parts + 6 walls + floor)
node transforms == kernel math:         PASS (TRS vs moduleTransform, independent computation)
node parity parts+walls+floor:          PASS (37 nodes)
byte-deterministic export:              PASS (identical hex across builds)
container well-formed (chunks/offsets): PASS
CP-01..CP-04 suites unchanged:          PASS
legacy configurator unchanged:          PASS

TESTS
node --test: 104 tests, 104 pass, 0 fail

OUT-OF-BAND ROUND TRIP (kept out of the committed suite to stay dependency-free)
/tmp with full three@0.160.0 npm package:
  GLTFLoader.parse(kitchen-2500x1500.glb) -> OK, meshes 37
  sample node a1-side-left scale [18,560,720], pos [9,280,360]  (matches part box / module offset)

EVIDENCE ARTIFACTS
docs/checkpoints/evidence/kitchen-2500x1500.glb  (regenerate: node src/kernel/tools/render-evidence.js)

KNOWN LIMITATIONS / DEFERRED
- No textures/material authoring, no Draco, no animations (out of scope).
- GLB import into the canonical model deliberately unsupported (one-way flow).
- "download GLB" click-through needs a real browser (none in sandbox); the exporter itself is
  test- and GLTFLoader-verified.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-06 - pointer-based drag between runs in the preview (wired to applyAction), or a PDF/Excel
cutting document from the BOM. Do not start automatically.
```
