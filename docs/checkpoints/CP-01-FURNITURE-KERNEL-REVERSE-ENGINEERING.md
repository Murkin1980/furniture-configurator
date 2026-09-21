# CP-01 — Furniture Kernel Reverse Engineering

## Repository
`Murkin1980/furniture-configurator`

This instruction is stored on the `checkpoints` branch.

**Decision: EXTEND_EXISTING**

All research, implementation, fixtures, tests, ADRs and evidence produced by CP-01 belong to this existing repository. Do not create a substitute repository.

---

## 0. Mandatory startup

Before changing implementation:

1. Work in `Murkin1980/furniture-configurator`.
2. Read `AGENTS.md`.
3. Read `skills/simplicity-first/SKILL.md`.
4. Read `SIMPLICITY_REVIEW.md` from the `checkpoints` branch.
5. Read `README.md` and inspect the current source tree.
6. Record repository, branch, HEAD SHA, base SHA and working-tree state.
7. Preserve existing configurator behavior unless CP-01 explicitly requires an isolated addition.
8. Create/use a dedicated Arena implementation branch from the current default implementation branch (`master`). Do not implement directly on the `checkpoints` branch.

If the repository is unavailable, report:

`REPOSITORY_NOT_AVAILABLE`

and STOP.

---

## 1. Goal

Identify the technical solution behind the public GrabSketch configurator and prove the smallest deterministic furniture kernel inside the existing `furniture-configurator` project.

Target:
https://grabsketch.com/ru/

The checkpoint is about the technical engine, not product logic or UI.

Primary questions:

- What frontend/runtime and 3D technologies can be confirmed?
- Where does canonical project state appear to live?
- Is furniture generated parametrically?
- How are room walls, corners and placement represented?
- How are manufacturing parts/BOM derived?
- What runs client-side vs server-side?
- Which technical ideas can be reproduced safely in our existing project without copying proprietary code?

---

## 2. Legal/safety boundary for reverse engineering

Analyze only:

- public browser-delivered assets;
- normal browser runtime behavior;
- public documentation;
- normal network requests made by the public application;
- browser storage created by normal use;
- public exports/imports;
- public API responses available without bypassing controls.

Do NOT:

- bypass authentication;
- bypass authorization/access controls;
- exploit vulnerabilities;
- defeat security mechanisms;
- retrieve private source code;
- present minified/obfuscated proprietary implementation as code to copy.

The goal is architectural/behavioral understanding and an independent implementation.

---

## 3. Evidence classification

Every major forensic claim must be classified as exactly one of:

- `CONFIRMED`
- `STRONG_INFERENCE`
- `WEAK_INFERENCE`
- `UNKNOWN`

Every `CONFIRMED` claim must include reproducible evidence.

An `UNKNOWN` result is acceptable. Fabricated certainty is not.

---

## 4. Forensic investigation

### 4.1 Frontend/runtime

Determine where possible:

- framework/runtime;
- SPA architecture;
- JS chunk/bundle structure;
- state-management signals;
- Web Workers;
- WebAssembly;
- geometry/graphics libraries;
- third-party dependencies relevant to the editor.

### 4.2 3D engine

Determine whether evidence supports:

- Three.js;
- Babylon.js;
- another WebGL framework;
- custom WebGL.

Inspect public evidence such as:

- bundle fingerprints/symbols;
- GLB/glTF handling;
- scene/object lifecycle;
- camera controls;
- materials/textures;
- shaders if publicly delivered;
- export behavior.

Do not claim Three.js unless confirmed or clearly marked as inference.

### 4.3 Canonical project state

Investigate whether one canonical project model appears to drive multiple outputs.

Conceptual target only:

```
Project
 ├── Room
 │    ├── Walls
 │    ├── Openings
 │    └── Obstacles
 ├── FurnitureModules
 ├── Materials
 ├── Hardware
 └── Pricing
```

Look at normal:

- network payloads;
- local/session storage;
- IndexedDB;
- JSON/serialized state;
- import/export;
- project IDs/URLs.

Record observed field names only when actually observed.

### 4.4 Parametric generation

Test whether changing width/height/depth/material/module configuration appears to regenerate:

- 3D geometry;
- parts;
- edges;
- holes;
- hardware;
- BOM;
- price;
- cutting information.

Classify computation boundary as:

- `CLIENT`
- `SERVER`
- `HYBRID`
- `UNKNOWN`

### 4.5 Room geometry and placement

Investigate observable support for:

- wall endpoints/segments;
- wall length/direction/angle;
- connected corners;
- doors/windows/openings;
- wall snapping;
- module snapping;
- collisions;
- occupied intervals;
- corner reservations;
- module movement after dimension changes.

Do not attribute placement to AI without evidence.

### 4.6 Manufacturing representation

Investigate relationships between a module and:

- panel dimensions;
- material;
- grain direction;
- edge banding;
- holes;
- cut-outs;
- hardware;
- BOM;
- price.

Determine whether a canonical manufacturing-level `Part` concept is strongly indicated.

### 4.7 Cutting optimizer

Observe only what can be reproduced from public behavior:

- client/server boundary;
- nesting/bin-packing behavior;
- rotation restrictions;
- grain constraints;
- kerf;
- margins;
- offcuts.

Do not name a specific algorithm unless evidence supports it.

---

## 5. Required forensic report

Create on the Arena implementation branch:

`docs/research/grabsketch-technical-reverse-engineering.md`

Required sections:

1. Executive technical finding
2. Observed architecture
3. Frontend/runtime
4. 3D engine
5. Canonical project model
6. Geometry model
7. Placement/constraints
8. Furniture generation
9. Manufacturing/BOM
10. Cutting optimization
11. Backend/API boundary
12. Confirmed findings
13. Strong inferences
14. Weak inferences
15. Unknowns
16. What must not be copied
17. Recommended implementation for this repository

---

## 6. Architecture decision for OUR project

Create:

`docs/adr/ADR-furniture-parametric-kernel.md`

Choose the smallest suitable approach for the existing browser-based repository.

Decide:

- language/runtime;
- geometry primitives;
- optional 3D renderer;
- canonical project model;
- placement strategy;
- BOM/Part derivation;
- test strategy.

Possible choices may include TypeScript/JavaScript + Three.js, but no technology is pre-approved merely because it is familiar.

The ADR must explicitly explain compatibility with the current repository and why a larger CAD stack is unnecessary for CP-01.

---

## 7. Existing architecture must be preserved

Current repository already contains a working image-based/config-driven furniture configurator with pricing, URL state and WhatsApp.

CP-01 must not rewrite or remove it.

Prefer an isolated kernel area, for example:

```
src/kernel/
  geometry/
  room/
  furniture/
  placement/
  bom/
```

If the current plain-JavaScript structure makes another small location more natural, use it and document why.

Do not introduce a second application unless unavoidable.

---

## 8. Critical invariant

The rendered scene must NOT be the source of truth.

Required direction:

```
Canonical Project Model
        ↓
Parametric Furniture Kernel
        ↓
 ┌────────────┬─────────────┬────────────┐
 ↓            ↓             ↓
View/3D      BOM/Parts    Validation
```

One dimension change must propagate from the canonical model.

Do not manually maintain different dimensions in renderer and BOM logic.

---

## 9. Minimum canonical model

Implement only enough semantics to prove:

```
Project
 └── Room
      └── Wall[]

Wall
 ├── start
 ├── end
 ├── direction
 ├── length
 └── openings[]

FurnitureModule
 ├── type
 ├── width
 ├── height
 ├── depth
 ├── wallId
 ├── wallOffset
 └── parameters

Part
 ├── moduleId
 ├── width
 ├── height
 ├── thickness
 ├── material
 └── edges
```

Exact names may differ.

Keep semantic separation between:

- room geometry;
- module parameters;
- manufacturing parts;
- rendered geometry.

---

## 10. Placement engine — minimum scope

Implement deterministic wall-coordinate placement sufficient to:

- calculate wall vector;
- calculate wall length;
- calculate wall angle;
- convert `wallOffset` to world coordinates;
- orient a module to its wall;
- detect basic module overlap;
- calculate connected-wall intersection/corner;
- support two perpendicular walls.

Do not implement a generalized optimizer yet.

---

## 11. Mandatory real acceptance fixture

Use one real Salamat case:

```
L-shaped kitchen
Wall A: 2500 mm
Wall B: 1500 mm
Corner: 90°
```

Store fixture data under an existing suitable test/fixture convention, or create a minimal:

`fixtures/kitchen-2500x1500/`

The fixture must prove:

1. both walls are mathematically correct;
2. their common corner is calculated, not manually placed;
3. Wall A modules align to Wall A;
4. Wall B modules align to Wall B;
5. modules do not unintentionally overlap;
6. corner occupancy/module attaches correctly;
7. changing one cabinet width changes its geometry;
8. dependent placement is recalculated where applicable;
9. Parts/BOM are regenerated;
10. no AI model is required to preserve geometric validity.

---

## 12. Minimal parametric cabinet

Implement at least one base cabinet.

Example parameters:

```
width = variable
height = 720
depth = 560
panelThickness = 18
```

Generate at least:

- left side;
- right side;
- bottom;
- one rail/internal horizontal part;
- facade representation.

A width change must update:

- cabinet geometry;
- relevant panel dimensions;
- BOM/Parts.

Renderer/view code and BOM code may not duplicate hard-coded cabinet dimensions.

---

## 13. 90° corner gate

The corner is a mandatory PASS gate.

Do not fake the L-shape with manually positioned meshes.

Conceptual geometry:

```
Wall A ─────────┐
                │
                │ Wall B
```

Changing wall endpoints must update the calculated intersection.

If the kernel cannot do this reliably, CP-01 = FAIL.

---

## 14. Visual technical proof

Create the smallest reproducible browser/debug preview showing:

- 2500×1500 L-shaped room;
- both walls;
- calculated corner;
- generated test cabinet(s);
- corner occupancy/module.

Allowed:

- wireframe;
- basic colors/materials;
- axes/grid;
- dimension/debug labels.

Do not polish UI.

---

## 15. Automated tests

Test at minimum:

- wall length;
- wall direction;
- wall angle;
- wall intersection;
- `wallOffset → world coordinates`;
- module orientation;
- overlap/collision;
- parameter change;
- geometry regeneration;
- Part regeneration;
- BOM regeneration.

Use floating-point tolerances where appropriate.

Geometry correctness is more important than visual snapshots.

---

## 16. Out of scope

Do NOT implement during CP-01:

- full kitchen catalogue;
- polished drag-and-drop editor;
- wardrobe configurator expansion;
- sliding-door production system;
- supplier database;
- full pricing migration;
- CNC export;
- full cutting optimizer;
- photo-to-kitchen AI;
- LLM layout generation;
- AI render pipeline;
- customer accounts;
- checkout;
- WhatsApp redesign;
- production deployment.

Researching GrabSketch behavior is allowed. Implementing all of it is not.

---

## 17. Required deliverables

CP-01 requires:

A. GrabSketch forensic report  
B. evidence/confidence matrix  
C. architecture ADR  
D. canonical model/schema  
E. minimal parametric cabinet generator  
F. wall-coordinate placement  
G. mathematical 90° corner  
H. Part/BOM derivation  
I. automated geometry tests  
J. browser/debug preview  
K. 2500×1500 fixture  
L. CP-01 evidence report

Evidence report path:

`docs/checkpoints/CP-01-EVIDENCE.md`

---

## 18. Evidence report format

```
CP-01 RESULT: PASS | FAIL

REPOSITORY:
Murkin1980/furniture-configurator

BRANCH:
HEAD SHA:
BASE SHA:

FORENSICS
GrabSketch frontend:
Confidence:

GrabSketch 3D engine:
Confidence:

Canonical-state evidence:
Confidence:

Client/server boundary:
Confidence:

Manufacturing-model evidence:
Confidence:

Cutting-engine evidence:
Confidence:

OUR IMPLEMENTATION
Chosen runtime:
Chosen renderer/view:
Canonical model:
Geometry kernel:
Placement strategy:
BOM strategy:

ACCEPTANCE
2500×1500 fixture:
90° corner:
Wall placement:
Collision checks:
Parameter regeneration:
Geometry regeneration:
BOM regeneration:
Automated tests:
Build:
Preview:

FILES CREATED/MODIFIED:

KNOWN UNKNOWNS:

DEEP-CHANGE REQUIRED:
YES | NO

NEXT RECOMMENDED CHECKPOINT:
```

---

## 19. PASS criteria

PASS only when all are true:

- work stayed in `Murkin1980/furniture-configurator`;
- no substitute repository was created;
- forensic report exists;
- evidence and inference are separated;
- ADR exists;
- canonical model exists;
- room uses mathematical wall geometry;
- 90° corner is calculated, not visually faked;
- one cabinet is parametrically generated;
- dimension changes regenerate geometry;
- dimension changes regenerate Parts/BOM;
- 2500×1500 fixture passes;
- automated tests pass;
- build/static-app verification passes;
- debug preview is reproducible;
- existing configurator remains functional.

---

## 20. Failure handling

Return FAIL rather than hide limitations if:

- corner geometry is unreliable;
- renderer/view and BOM need separate manually maintained dimensions;
- placement requires manually entered world XYZ for normal wall placement;
- parameter changes make geometry unstable;
- implementation breaks the existing configurator.

Failure to identify GrabSketch's exact internal engine does not automatically fail the checkpoint.

`UNKNOWN` is valid forensic output.

---

## 21. Deep-change gate

STOP and request explicit owner approval before:

- replacing the existing configurator architecture wholesale;
- moving this work to another repository;
- introducing mandatory external CAD infrastructure;
- adopting a paid proprietary geometry engine;
- making Blender mandatory at runtime;
- making SketchUp mandatory at runtime;
- changing the fundamental deployment model;
- introducing substantial backend infrastructure.

Report:

`DEEP_CHANGE_APPROVAL_REQUIRED`

with the reason, then STOP.

---

## 22. Completion rule

The question is not:

> Can we clone GrabSketch?

The question is:

> Can the existing `furniture-configurator` repository independently implement one canonical parametric model that correctly produces room geometry, cabinet geometry and manufacturing parts for the 2500×1500 L-shaped Salamat kitchen case?

If yes:

1. prove it;
2. record evidence;
3. commit and push the tested implementation branch;
4. report CP-01 PASS;
5. STOP.

Do not start CP-02 automatically.
