# CP-11 — Ergonomics Checklist (Derived Validation Readouts)

Status: AGENT-AUTHORED SCOPE (owner continuation approval in chat; no owner spec existed)
Repository: `Murkin1980/furniture-configurator`
Depends on: CP-01..CP-10
Implementation decision: EXTEND_EXISTING

> Written by the Arena agent after the owner instructed "continue where you stopped" with CP-10
> complete and no CP-11 spec on any branch. Mirrors GrabSketch's numeric checklist as derived
> readouts. An owner spec supersedes this document.

## Goal

Surface the ergonomics/installation rules GrabSketch's help documents as machine-readable, derived
validation readouts computed ONLY from the kernel bundle. Rules the canonical model cannot express
are reported 'na' - never fabricated (UNKNOWN/na is acceptable; false certainty is not).

## Required scope

1. `src/kernel/validation/checklist.js` - `checklist(bundle)` + `CHECKLIST_LIMITS`. Items:
   fits-room (no overflow + nothing above ceiling), no-gaps (no RUN_GAP), base-depth >=560,
   top-depth 300-400 (na if none), corner-facade >=500 (declared corner cabinets only),
   worktop-height (na - not modelled), sink-width >=600 (na unless declared).
2. `kernel-preview.html` - "Checklist" section rendering pass/fail/na readouts.
3. Tests `cp11-checklist.test.js`: CP-01 passes modelled rules + na for unmodelled; shallow bottom
   fails base-depth; gap fails no-gaps; tall module fails fits-room; corner rule on declared corner
   cabinets; determinism.
4. `docs/checkpoints/CP-11-EVIDENCE.md`.

## Explicitly out of scope

- auto-"fixing" violations (checklist is read-only);
- rules requiring un-modelled concepts (worktop/plinth heights) beyond 'na';
- any CP-01..CP-10 behavior change (all suites green; legacy byte-identical).

## Acceptance criteria

- every status derived from the bundle; unmodelled rules 'na';
- violations flip the right item to fail (tested);
- 134 tests pass; fixtures and legacy unchanged; clean working tree.

## Stop condition

Stop after CP-11. Do not start further checkpoints automatically.
