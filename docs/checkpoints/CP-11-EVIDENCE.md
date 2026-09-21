# CP-11 Evidence Report

```
CP-11 RESULT: PASS (checklist logic test-verified; panel render click-through is manual - no
headless browser in sandbox)

REPOSITORY:
Murkin1980/furniture-configurator
BRANCH:
arena/01a0c2ce-furniture-configurator
BASE (CP-10):
55193ae (+ CP-02 completion pass 3a8bd45)
SPEC:
docs/checkpoints/CP-11-SPEC.md (agent-authored scope; owner continuation approval in chat)

WHAT WAS BUILT
- validation/checklist.js: checklist(bundle) + CHECKLIST_LIMITS. Derived pass/fail/na readouts:
  fits-room, no-gaps, base-depth>=560, top-depth 300-400, corner-facade>=500 (declared corner
  cabinets only), worktop-height na, sink-width na-unless-declared.
- kernel-preview.html: "Checklist" section rendering the readouts (green/red/grey).
- tests: cp11-checklist.test.js.
- README/ADR notes.

DESIGN NOTE (honesty)
The CP-01 fixture's corner-closing module (b2=470) is NOT a "corner facade" in GrabSketch's sense,
so the corner rule applies only to modules that declare parameters.corner; otherwise the item is
'na'. This avoids fabricating a fail on a valid fixture - UNKNOWN/na is acceptable.

ACCEPTANCE (spec §"Acceptance criteria")
statuses derived from bundle:          PASS (all items read issues/modules/corners/room only)
unmodelled rules 'na':                 PASS (top-depth/worktop/sink na on CP-01)
violations flip the right item:        PASS (depth 350 -> base-depth fail; width 500 -> no-gaps
                                       fail; height 3000 -> fits-room fail; corner 400 -> fail)
CP-01 passes modelled rules:           PASS (fits-room/no-gaps/base-depth pass)
determinism:                           PASS
CP-01..CP-10 suites unchanged:         PASS
legacy configurator unchanged:         PASS

TESTS
node --test: 134 tests, 134 pass, 0 fail

VERIFICATION BEYOND TESTS
- checklist.js and the preview inline module pass node --check; preview served 200 with the
  Checklist section (curl-verified).
- Panel render needs a real browser (none in sandbox); checklist() is fully test-covered.

DEEP-CHANGE REQUIRED:
NO

NEXT RECOMMENDED CHECKPOINT:
CP-12 - tall/pantry module type + worktop/plinth parameters so currently-'na' rules become
modelled, or GLB/PDF export of the edited (post-action) definition. Do not start automatically.
```
