# CP-06 — Cutting-List PDF Export

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01 (parts/BOM)..CP-05
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-05
> complete and no CP-06 spec on any branch. Completes the manufacturing-output side of the
> GrabSketch pipeline (part spec with edge banding -> printable cutting document). The Excel/CSV
> half already exists from CP-01 (bomCsv). An owner spec supersedes this document.

## Goal

Export a printable cutting list as PDF 1.4 straight from `bundle.parts` - the same records the BOM
aggregates: part id, material, L/W/T, grain, edge-banding flags, qty, plus cutting totals. The PDF
is a projection of derived data (no re-computed dimensions), byte-deterministic (no dates/ids),
dependency-free, and ASCII-only (base-14 fonts carry no reliable Cyrillic; part ids are ASCII).

## Required scope

1. `src/kernel/view/cuttingPdf.js` - `cuttingPdf(bundle, { projectId })` emitting a valid PDF 1.4
   (uncompressed streams, correct xref), paginated at 46 rows/page.
2. `kernel-preview.html` gains "download cutting PDF".
3. Deterministic artifact `docs/checkpoints/evidence/cutting-kitchen-2500x1500.pdf`.
4. Tests `cp06-pdf.test.js`: container magic/EOF; xref offsets resolve to their objects; page count
   matches the part list; every part id + totals present in the extracted text operators; byte
   determinism.
5. Out-of-band: parse the PDF with pdfjs-dist (full npm package, /tmp) and verify extracted text
   contains the part rows (recorded in evidence; not a committed test, to stay dependency-free).
6. `docs/checkpoints/CP-06-EVIDENCE.md`.

## Explicitly out of scope

- Cyrillic typography / custom embedded fonts; vector rules/graphics beyond text; compression;
- sheet nesting diagrams (honest lower-bound estimate stays);
- PDF *import*; any CP-01..CP-05 behavior change (all suites green; legacy byte-identical).

## Acceptance criteria

- pdfjs-dist (independent implementation) extracts the full cutting table from the committed
  artifact;
- xref/page/table checks pass in the committed suite;
- export is byte-deterministic;
- 108 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-06. Do not start further checkpoints automatically.
