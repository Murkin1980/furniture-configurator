# CP-01 Evidence Report

```
CP-01 RESULT: PASS

REPOSITORY:
Murkin1980/furniture-configurator

BRANCH:
arena/01a0c2ce-furniture-configurator
HEAD SHA:
__HEAD_SHA__            (implementation commit; set at push time)
BASE SHA:
fb50b1e2b648cd1133dc305b71a60ac81d5e8041   (master; branch start)

FORENSICS
GrabSketch frontend:
Next.js SPA (App-style routes /en|de|pl|ru, /project/{uuid}), server-rendered marketing + client editor.
Confidence:
CONFIRMED (Next.js fingerprint via /_next/image, sitemap, i18n); React = STRONG_INFERENCE.

GrabSketch 3D engine:
Real-time WebGL scene graph with orbit/pan/zoom camera, object picking, articulated facades,
shadow/AA/pixel-ratio quality settings, GLB export. Specific library not captured.
Confidence:
WebGL renderer = CONFIRMED (public docs/viewer); Three.js = STRONG_INFERENCE; exact engine = UNKNOWN.

Canonical-state evidence:
One model drives Design/Cutting/Cost + 3D; UUID projects on CDN; hierarchical params; openings on walls.
Confidence:
CONFIRMED (public help/vendor copy).

Client/server boundary:
Parametric core instant client-side; persistence/AI/exports server-side.
Confidence:
HYBRID = STRONG_INFERENCE.

Manufacturing-model evidence:
Canonical Part with length/width/edge-banding split by body/facade/countertop; drilling/cut-outs.
Confidence:
CONFIRMED (public parts table + Cutting-tab docs).

Cutting-engine evidence:
Sheet nesting with fill %, separate countertop layout, unfit parts flagged, price by area or whole sheet.
Confidence:
CONFIRMED (public docs); algorithm family = UNKNOWN.

OUR IMPLEMENTATION
Chosen runtime:
Vanilla ES Modules, Node 22 for tests, zero dependencies.
Chosen renderer/view:
Dependency-free SVG (plan + isometric wireframe), derived from the kernel.
Canonical model:
JSON Project{room{walls,openings}, modules, sheet} -> buildProject(); see src/kernel/README.md.
Geometry kernel:
2D plan vectors; corner = line intersection of wall axes; inward normals from polygon orientation.
Placement strategy:
Wall coordinates (wallOffset + inward normal); auto-packed runs; computed corner reservations; SAT collision.
BOM strategy:
Single parametric generator per module; BOM aggregates; view reads part.box; validation reads same bundle.

ACCEPTANCE
2500x1500 fixture:
PASS (fixtures/kitchen-2500x1500/project.json; 12 fixture tests).
90° corner:
PASS (computed at (2500,0) by line intersection; follows endpoint edits; owner a4; stand-off 560).
Wall placement:
PASS (wall-a/wall-b modules align to their walls; offsets derived; b1 stands off 560).
Collision checks:
PASS (findOverlaps empty on fixture; naive corner placement detected as a clash).
Parameter regeneration:
PASS (a3 600->500 regenerates bottom/rail/facade + boxes).
Geometry regeneration:
PASS (view + footprints follow parameter; corner follow on wall edits).
BOM regeneration:
PASS (564->464 bottom line swap; totals recomputed; area decreases).
Automated tests:
PASS (68 tests, 0 failures; node --test).
Build:
PASS (no build step; static app serves; all assets HTTP 200; index.html byte-identical to master).
Preview:
PASS (http://…:8080/kernel-preview.html renders; SVG evidence rendered and verified).

FILES CREATED/MODIFIED:
Created: src/kernel/** (geometry, room, furniture, placement, bom, validation, model, view, tools, tests),
fixtures/kitchen-2500x1500/project.json, kernel-preview.html, package.json,
docs/research/grabsketch-technical-reverse-engineering.md, docs/adr/ADR-furniture-parametric-kernel.md,
docs/checkpoints/evidence/* , docs/checkpoints/CP-01-EVIDENCE.md, src/kernel/README.md.
Modified: none of the pre-existing files (index.html and src/*.js unchanged vs master).

KNOWN UNKNOWNS:
Exact GrabSketch 3D engine/versions (raw bundles behind a Cloudflare edge unreachable from sandbox);
internal API/DB; state lib; WebAssembly/Workers. Multi-run (P-shape) auto-packing and a real cutting
optimiser are out of scope for CP-01.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-02 — attach an optional Three.js view to the existing kernel (renderer stays derived), and add
multi-run (P-shape) auto-packing + opening-aware placement. Do not start automatically.
```

## Supporting evidence artifacts (regenerate any time)

- `docs/checkpoints/evidence/plan-kitchen-2500x1500.svg` — derived plan view of the fixture.
- `docs/checkpoints/evidence/plan-kitchen-2500x1500-a3-500.svg` — plan after `a3: 600→500` (shows propagation + a reported 100 mm RUN_GAP).
- `docs/checkpoints/evidence/iso-kitchen-2500x1500.svg` — isometric wireframe, one box per Part.
- `docs/checkpoints/evidence/bom-kitchen-2500x1500.csv` — derived parts/BOM with edge banding.
- `docs/checkpoints/evidence/derivation-report.json` — machine-readable corner/reservation/occupancy/BOM report.

Reproduce locally:

```
npm test                                   # 68 tests
node src/kernel/tools/serve.js 8080        # then open /kernel-preview.html and /
node src/kernel/tools/render-evidence.js   # regenerate evidence artifacts
```

## Pre-existing legacy note (honesty)

`validateProduct(wardrobe)` on pristine `master` already returns 3 schema errors
(counter options without `values` arrays). CP-01 preserves existing behaviour, so this is pinned
in `src/kernel/tests/legacy-configurator.test.js` and left unchanged. It is unrelated to the
kernel and was not introduced by CP-01.
