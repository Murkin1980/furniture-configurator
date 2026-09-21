# CP-06 Evidence Report

```
CP-06 RESULT: PASS

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-05):
c1378f0
SPEC:
docs/checkpoints/CP-06-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- view/cuttingPdf.js: dependency-free PDF 1.4 exporter. cuttingPdf(bundle, {projectId}) lists every
  part (id, material, L/W/T, grain, edge flags, qty) + cutting totals, 46 rows/page, uncompressed
  streams, correct xref, ASCII-only, no dates -> byte-deterministic.
- kernel-preview.html: "download cutting PDF" button.
- render-evidence.js writes docs/checkpoints/evidence/cutting-kitchen-2500x1500.pdf (13572 bytes).
- tests: cp06-pdf.test.js.
- README/ADR notes.

ACCEPTANCE (spec §"Acceptance criteria")
independent parse (pdfjs-dist):        PASS - committed artifact: 1 page; extracted text contains
                                        a1__side-left, b2__facade, totals line, project id
xref offsets resolve to objects:        PASS (every "n 0 obj" at its xref offset)
page count matches part list:           PASS (30 parts -> /Count 1)
table carries every part + totals:      PASS (all 30 part ids extracted from text operators)
byte-deterministic:                     PASS (identical hex across builds)
CP-01..CP-05 suites unchanged:          PASS
legacy configurator unchanged:          PASS

TESTS
node --test: 108 tests, 108 pass, 0 fail

OUT-OF-BAND ROUND TRIP (kept out of the committed suite to stay dependency-free)
/tmp with pdfjs-dist@3.11.174: getDocument(cutting-kitchen-2500x1500.pdf) -> numPages 1;
getTextContent() yields the full table (header, 30 rows, totals). Rendering warnings (canvas /
standardFontData) are expected in headless node and do not affect text extraction.

EVIDENCE ARTIFACTS
docs/checkpoints/evidence/cutting-kitchen-2500x1500.pdf (regenerate: node src/kernel/tools/render-evidence.js)

KNOWN LIMITATIONS / DEFERRED
- ASCII-only typography (base-14 fonts; part ids are ASCII by construction); no vector rules or
  nesting diagrams; no compression.
- "download cutting PDF" click-through needs a real browser (none in sandbox); the exporter is
  test- and pdfjs-dist-verified.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-07 - pointer-based drag between runs in the preview (wired to applyAction), or room-shape
editing (drag corners, Shift-snap 90 deg) mirroring GrabSketch's room editor. Do not start
automatically.
```
