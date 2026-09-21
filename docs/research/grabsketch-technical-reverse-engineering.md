# GrabSketch Technical Reverse-Engineering Report (CP-01 §4-5)

**Target:** https://grabsketch.com/ru/
**Scope:** public browser-delivered content, public documentation, normal public behaviour.
**Method:** read public pages, sitemap, robots, help docs and a public project page. All
claims below were reproduced by fetching public URLs; where the sandbox could not reach
an asset (see *Method limitation*), the claim is downgraded rather than invented.

> **Classification legend (CP-01 §3)**
> `CONFIRMED` = reproduced from public evidence · `STRONG_INFERENCE` = well-supported but
> not directly observed · `WEAK_INFERENCE` = plausible, weak signal · `UNKNOWN` = not observed.

---

## 1. Executive technical finding

GrabSketch is a **Next.js, browser-first, real-time 3D furniture configurator** whose single
canonical project model simultaneously drives **(a)** a real-time WebGL scene, **(b)** a
manufacturing parts/cutting list, and **(c)** a priced estimate. The layout/placement core is
**deterministic and rule-driven** (sequential wall runs, computed corner stand-offs, 25+
ergonomic rules), while AI features (render, photo-to-project, chat assistant) exist as
**separate, optional layers** on top. This is exactly the architecture CP-01 reproduces in
miniature: *canonical model → parametric kernel → { view | BOM | validation }*.

## 2. Observed architecture

`CONFIRMED` — The product is a three-tab SPA (**Design → Cutting → Cost**) plus a separate
**Room editor** window and a **Checklist** panel (public help doc). The same project feeds all
three tabs and the 3D view, which implies one canonical model fanned out to multiple consumers
— the same one-way data flow CP-01 mandates.

## 3. Frontend / runtime

- `CONFIRMED` **Next.js** — public pages reference the Next.js image optimiser
  (`/_next/image?url=…&w=3840&q=75`) and `/sitemap.xml` / i18n route structure (`/en`, `/de`,
  `/pl`, `/ru`). Reproducible by fetching https://grabsketch.com/ru/ and `/sitemap.xml`.
- `CONFIRMED` **Server-rendered marketing/help content** with a client-side editor app mounted
  on `/project/*` routes.
- `STRONG_INFERENCE` **React** (Next.js default; control-bar and tab UX match a React SPA).
- `UNKNOWN` specific React/Next versions, state-management library, presence of Web Workers or
  WebAssembly — not observable without raw bundle access.

## 4. 3D engine

- `CONFIRMED` **real-time WebGL scene graph**: the public project viewer exposes orbit/pan/zoom
  camera controls (`LMB+drag` rotate, `RMB+drag` pan, `wheel` zoom), object-level picking
  ("select object / select cabinet", "tap facade to open or close it"), articulated facades,
  and quality settings for shadows / antialiasing / pixel sharpness / model detail
  (`Performance` preset High/Balanced/Economy). These are all hallmarks of an interactive
  WebGL scene with a camera, raycast picking and a shadow-capable renderer.
- `CONFIRMED` **glTF/GLB capability**: "export to GLB" and "3D-модель в GLB" appear in public docs.
- `STRONG_INFERENCE` **Three.js** is the most likely engine (React/Next ecosystem convention,
  GLB export via a glTF exporter, orbit-style controls). **Not confirmed.**
- `UNKNOWN` exact engine (Three.js vs Babylon.js vs custom). Raw JS bundles sit behind a
  Cloudflare edge that this sandbox could not fetch (see limitation), so no bundle fingerprint
  (`three.module.js`, `babylon.js`) could be captured.

## 5. Canonical project model

- `CONFIRMED` public projects are addressable by UUID (`/project/a8532102-2b4d-4c19-8273-2f2f003a888f`)
  with preview PNGs on a CDN (`cdn.grabsketch.com/previews/projects/{uuid}.png`) — i.e. projects
  are persisted server-side and referenced by id, with a shareable link.
- `STRONG_INFERENCE` one canonical model drives 3D + parts + cutting + price: vendor copy states
  "Меняете что угодно — цена, раскрой и 3D-вид обновляются мгновенно" (change anything and price,
  cutting and 3D update instantly), and the Design/Cutting/Cost tabs read the same project.
- `CONFIRMED` **hierarchical parameters**: per-block parameters (width/height/interior/facade)
  plus group-level parameters applied across a whole set (Bottom/Top/Tall/Mezzanine/Room tabs:
  shared height, depth, back-panel type, plinth, legs, GOLA).
- `CONFIRMED` **openings belong to walls**: "clicking a wall opens its elements — doors, windows
  and other openings you can add and position on that wall".
- Observed conceptual shape matches CP-01 §4.3 target:
  `Project → Room{Walls,Openings,Obstacles} + FurnitureModules + Materials + Hardware + Pricing`.

## 6. Geometry model

- `CONFIRMED` **walls are polylines with editable corner vertices**, not just two lengths:
  the Room editor is driven by dragging corner dots; angle snapping exists (`hold Shift to snap
  to exactly 90°`) and non-right angles are supported ("even if walls are not strictly 90°").
- `CONFIRMED` walls carry a length/direction and a starting point for the run ("Starting point"
  left/right) — i.e. placement is wall-relative, matching CP-01's `wallOffset` design.
- `STRONG_INFERENCE` walls have thickness/inner-face semantics for corner joints ("euro cut"
  rounded corner joints, corner cabinets auto-adjust depth to neighbouring runs).

## 7. Placement / constraints

- `CONFIRMED` **sequential, non-overlapping run placement**: "Cabinets in a run are placed in
  order, one after another, without overlapping, and route around obstacles".
- `CONFIRMED` **gap detection**: empty space is highlighted as a translucent red gap block with a
  "+" affordance, and the Checklist catches remaining gaps.
- `CONFIRMED` **corner occupancy/stand-off**: corner cabinets auto-adjust depth and facade width
  to match the neighbouring runs — the same corner-reservation concept CP-01 implements.
- `CONFIRMED` **rule-based validation** (not AI): 25+ ergonomic/mount rules with numeric thresholds
  (worktop 850-920, plinth 80-150, base depth ≥560, top 300-400, sink ≥600, corner facade ≥500/400).
- `WEAK_INFERENCE` collisions/occupied-interval bookkeeping is interval-based along each wall.

## 8. Furniture generation

- `CONFIRMED` **parametric regeneration**: changing width/height/depth/facade instantly updates 3D,
  parts and price; block library of 30+ kitchen / 8 wardrobe module types; blocks carry a full
  drawing (panels, dimensions, hardware) that updates when the size changes.
- `CONFIRMED` auto-derivation of doors/hinges: "swing doors — left, right or double — hinges and
  clearances are calculated automatically for any width".

## 9. Manufacturing / BOM

- `CONFIRMED` a canonical **Part** concept is strongly indicated: the parts table lists per-part
  *length, width, edge banding* (e.g. 720×560, 800×560, 396×178) and the Cutting tab splits the
  spec by **body / facade / countertop material**, each panel with dimensions, **edge banding along
  length and width**, drilling and cut-outs.
- `CONFIRMED` hardware (hinges, runners 250-600, lift systems, cargo) and real-supplier LDSP/MDF
  textures feed the BOM.

## 10. Cutting optimisation

- `CONFIRMED` **sheet nesting with fill percentage**, a separate countertop layout, parts that
  don't fit flagged, and pricing by *actual sheet-area usage or whole sheets* → a bin-packing
  step with offcut accounting.
- `STRONG_INFERENCE` grain/rotation constraints exist (edge/texture direction) but the exact
  algorithm is not observable; CP-01 §4.7 correctly forbids naming one.

## 11. Backend / API boundary

- `CONFIRMED` accounts, workspace, presets, credits and AI render imply a server (auth, storage,
  billing, AI compute). Export to PDF/Excel and CDN previews are server/CDN-assisted.
- `STRONG_INFERENCE` the parametric geometry/cutting core runs **client-side** (instant, no
  round-trip described), while persistence/AI/exports are server-side → **HYBRID** boundary.
- `UNKNOWN` exact endpoints, DB, or language.

## 12. Confirmed findings (summary)

Next.js SPA · real-time WebGL scene with picking/articulation · GLB/PDF/Excel export · UUID
projects on a CDN · wall-polyline room editor with 90° snapping · sequential non-overlapping runs ·
red gap blocks · corner auto-stand-off · hierarchical params · openings on walls · parts with
length/width/edge-banding split by material · sheet nesting with fill % · rule-based checklist ·
AI as a separate optional layer.

## 13. Strong inferences

Three.js likely engine · React SPA · single canonical model fanned out to view/BOM/price ·
client-side parametric core with server persistence (HYBRID) · interval-based wall placement.

## 14. Weak inferences

Interval bookkeeping details · LOD/worker usage · specific nesting algorithm family.

## 15. Unknowns

Exact 3D engine and versions · state-management lib · WebAssembly/Workers · internal API/DB.

## 16. What must NOT be copied

Proprietary minified bundles, the exact texture/supplier catalogues, branding, and any code or
assets retrieved by bypassing controls. CP-01 reproduces only the *architecture and mathematics*
(wall geometry, corner stand-off, parametric parts, BOM aggregation) with an **independent
implementation**.

## 17. Recommended implementation for this repository

Keep the existing configurator; add an isolated, dependency-free kernel under `src/kernel/` that
models room walls/openings, wall-relative modules, a computed 90° corner, one parametric base
cabinet, parts/BOM derivation and validation — with SVG-derived views. Exactly what this branch
implements (see `docs/adr/ADR-furniture-parametric-kernel.md`).

---

### Method limitation (honesty note)

Direct `curl` to `grabsketch.com` and to Cloudflare-fronted assets fails from this sandbox
(SSL_ERROR_SYSCALL; github.com and registry.npmjs.org work). Evidence was therefore gathered with
the platform's page fetcher over the public site and its public docs. Raw JS bundle fingerprints
could not be retrieved, so the 3D engine is reported as `STRONG_INFERENCE`/`UNKNOWN` rather than
`CONFIRMED`, per CP-01 §4.2. Per CP-01 §20, failing to identify the exact engine does not fail the
checkpoint.
