# SIMPLICITY_REVIEW

## Decision
EXTEND_EXISTING

## Business result
Prove whether the existing `furniture-configurator` repository can gain a deterministic parametric furniture kernel that correctly represents room geometry, cabinet geometry and manufacturing parts for one real L-shaped kitchen case.

## Existing system to preserve
The current repository already provides:
- a working furniture configurator;
- simple and parametric product definitions;
- formula-based pricing;
- URL serialization;
- image-based multi-angle viewer;
- WhatsApp order flow.

CP-01 must not replace these working capabilities.

## Options considered

### 1. Manual / semi-manual
Keep drawing kitchens manually and only improve prompts/renders.
- Lowest implementation effort.
- Does not solve the recurring geometry/corner correctness problem.
- Rejected as the technical experiment because it cannot prove deterministic geometry.

### 2. Extend this repository with a minimal deterministic kernel
Add an isolated parametric geometry/manufacturing experiment to the existing repository.
- Reuses the current product/config/pricing concepts.
- No new repository.
- No new backend required.
- Can be tested with one real 2500×1500 L-shaped kitchen.
- Selected.

### 3. Full CAD/configurator platform
Introduce Blender/SketchUp/proprietary CAD or rebuild the product as a large 3D application.
- Too much infrastructure.
- High integration and maintenance cost.
- Not justified before a minimal kernel is proven.
- Rejected for CP-01.

## Simplification passes
1. No new repository.
2. No backend required for the kernel proof unless forensic evidence absolutely requires one for observation.
3. No full kitchen catalogue.
4. No polished UI.
5. No AI layout generation.
6. No production CNC export.
7. No full cutting optimizer.
8. Only one real acceptance fixture: 2500×1500, 90° corner.
9. Only one minimal parametric cabinet plus corner occupancy/module proof.
10. 3D is a derived view, not the source of truth.

## Final workflow
GrabSketch public forensic analysis
→ evidence/confidence report
→ architecture decision for this repository
→ minimal canonical project model
→ deterministic wall/corner geometry
→ one parametric cabinet
→ parts/BOM derivation
→ debug preview
→ automated acceptance tests
→ evidence report
→ STOP

## Components kept
- existing repository and deployment model;
- existing configurator/product concepts;
- existing pricing concepts where reusable;
- existing README/AGENTS rules;
- browser-first implementation.

## Postponed
- complete drag-and-drop editor;
- complete 3D product catalogue;
- arbitrary-angle production support beyond what is needed to design the kernel;
- cutting optimization;
- CNC;
- supplier integrations;
- AI image/layout generation;
- customer-facing redesign.

## Rejected for CP-01
- new repository;
- mandatory Blender runtime;
- mandatory SketchUp runtime;
- paid proprietary CAD engine;
- duplicate pricing or product systems.

## Score
Clarity: 2/2
Few services: 2/2
Few dependencies: 2/2
Easy start: 2/2
Rollback: 2/2
Manual fallback: 2/2
No speculative scope: 2/2
One-developer understandability: 2/2
End-to-end testability: 2/2
Reuse of current system: 2/2

**Total: 20/20**

## Risks
- Public forensic evidence may not identify GrabSketch's exact internal libraries.
- Existing repository is currently image-viewer oriented, so a kernel may need to remain isolated until proven.
- Geometry can appear visually correct while being mathematically wrong; automated tests are mandatory.

## Manual fallback
The current configurator and manual kitchen-design workflow remain unchanged if CP-01 fails.

## Evidence required before adding complexity
- deterministic 90° corner from wall geometry;
- wall-relative module placement;
- geometry regeneration after a dimension change;
- Part/BOM regeneration from the same canonical model;
- automated tests;
- reproducible browser preview.

No larger architecture change is justified before these gates pass.
