/**
 * Regenerate the CP-01 evidence artifacts from the canonical fixture.
 *
 * Everything written here is DERIVED by buildProject(); this script holds no
 * dimensions of its own. Re-run it any time with:
 *
 *   node src/kernel/tools/render-evidence.js
 *
 * Outputs (committed as CP-01 evidence):
 *   docs/checkpoints/evidence/plan-kitchen-2500x1500.svg
 *   docs/checkpoints/evidence/plan-kitchen-2500x1500-a3-500.svg
 *   docs/checkpoints/evidence/iso-kitchen-2500x1500.svg
 *   docs/checkpoints/evidence/bom-kitchen-2500x1500.csv
 *   docs/checkpoints/evidence/derivation-report.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { buildProject, updateModule } from '../model/project.js';
import { planSvg } from '../view/planSvg.js';
import { isoSvg } from '../view/isoSvg.js';

const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const OUT = resolve(ROOT, 'docs/checkpoints/evidence');

const definition = JSON.parse(
  readFileSync(resolve(ROOT, 'fixtures/kitchen-2500x1500/project.json'), 'utf8'),
);

const csvEsc = (v) => `"${String(v).replace(/"/g, '""')}"`;

function bomCsv(bom, totals) {
  const head = [
    'label', 'material', 'length_mm', 'width_mm', 'thickness_mm', 'grain',
    'qty', 'area_m2', 'edge_banding_m', 'band_L_start', 'band_L_end', 'band_W_start', 'band_W_end',
  ];
  const rows = bom.map((l) =>
    [
      l.label, l.material, l.length, l.width, l.thickness, l.grain, l.count,
      l.areaM2.toFixed(6), l.bandingM.toFixed(3),
      l.edges.alongLengthStart, l.edges.alongLengthEnd,
      l.edges.alongWidthStart, l.edges.alongWidthEnd,
    ].map(csvEsc).join(','),
  );
  rows.push(
    ['TOTAL', '', '', '', '', '', totals.panels, totals.areaM2.toFixed(6), totals.bandingM.toFixed(3), '', '', '', '']
      .map(csvEsc).join(','),
  );
  return [head.join(','), ...rows].join('\n') + '\n';
}

function report(bundle) {
  return {
    generatedBy: 'src/kernel/tools/render-evidence.js',
    fixture: 'fixtures/kitchen-2500x1500/project.json',
    room: {
      id: bundle.room.id,
      orientation: bundle.room.orientation,
      walls: bundle.room.walls.map((w) => ({
        id: w.id,
        length: w.length,
        angleDeg: w.angleDeg,
        inwardNormal: w.inwardNormal,
      })),
      openings: bundle.room.openings.map((o) => ({
        id: o.id, kind: o.kind, wallId: o.wallId, offset: o.offset, width: o.width,
      })),
    },
    corners: bundle.corners.map((c) => ({
      id: c.id,
      point: c.point,
      turnDeg: c.turnDeg,
      endGap: c.endGap,
      startGap: c.startGap,
      owner: c.occupancy?.moduleId ?? null,
      ownerDepth: c.occupancy?.depth ?? null,
    })),
    reservations: [...bundle.reservations.values()].map((r) => ({
      wallId: r.wallId, atStart: r.atStart, atEnd: r.atEnd,
    })),
    modules: bundle.modules.map((m) => ({
      id: m.id, wallId: m.wallId, width: m.width, height: m.height,
      depth: m.depth, wallOffset: m.wallOffset,
    })),
    occupancy: bundle.occupancy.map((o) => ({ wallId: o.wallId, occupied: o.occupied, free: o.free })),
    totals: bundle.totals,
    cuttingGroups: bundle.cutting,
    issues: bundle.issues,
    partCount: bundle.parts.length,
  };
}

await mkdir(OUT, { recursive: true });

const base = buildProject(definition);
await writeFile(resolve(OUT, 'plan-kitchen-2500x1500.svg'), planSvg(base), 'utf8');
await writeFile(resolve(OUT, 'iso-kitchen-2500x1500.svg'), isoSvg(base), 'utf8');
await writeFile(resolve(OUT, 'bom-kitchen-2500x1500.csv'), bomCsv(base.bom, base.totals), 'utf8');
await writeFile(resolve(OUT, 'derivation-report.json'), JSON.stringify(report(base), null, 2) + '\n', 'utf8');

// Propagation evidence: shrink a3 from 600 to 500 and re-derive.
const { derived: narrowed } = updateModule(definition, 'a3', { width: 500 });
await writeFile(
  resolve(OUT, 'plan-kitchen-2500x1500-a3-500.svg'),
  planSvg(narrowed, { highlightModuleId: 'a3' }),
  'utf8',
);

// CP-02 evidence: two-run room with a door (opening-aware + multi-run).
const multirun = JSON.parse(
  readFileSync(resolve(ROOT, 'fixtures/kitchen-multirun/project.json'), 'utf8'),
);
const mr = buildProject(multirun);
await writeFile(resolve(OUT, 'plan-kitchen-multirun.svg'), planSvg(mr), 'utf8');

// CP-02 evidence: straight and P-shaped layouts from the canonical fixtures.
const straight = buildProject(
  JSON.parse(readFileSync(resolve(ROOT, 'fixtures/kitchen-straight/project.json'), 'utf8')),
);
await writeFile(resolve(OUT, 'plan-kitchen-straight.svg'), planSvg(straight), 'utf8');
const pshape = buildProject(
  JSON.parse(readFileSync(resolve(ROOT, 'fixtures/kitchen-p/project.json'), 'utf8')),
);
await writeFile(resolve(OUT, 'plan-kitchen-p.svg'), planSvg(pshape), 'utf8');

const offset = (b, id) => b.modules.find((m) => m.id === id).wallOffset;
console.log('evidence written to docs/checkpoints/evidence/');
console.log(`  baseline: parts=${base.parts.length} bomLines=${base.bom.length} panels=${base.totals.panels} area=${base.totals.areaM2.toFixed(4)}m2`);
console.log(`  corner wall-a__wall-b at (${base.corners[0].point.x}, ${base.corners[0].point.y}) owner=${base.corners[0].occupancy?.moduleId}`);
console.log(`  a3=600 -> a4 offset ${offset(base, 'a4')}; a3=500 -> a4 offset ${offset(narrowed, 'a4')}`);
console.log(`  a3=600 -> issues ${base.issues.length}; a3=500 -> issues ${narrowed.issues.map((i) => i.code).join(',') || 'none'}`);
console.log(`  multirun -> wall-a offsets ${mr.modules.filter((m) => m.wallId === 'wall-a').map((m) => m.wallOffset).join(',')} (door at 1200-2000 routed around)`);
console.log(`  multirun -> errors ${mr.issues.filter((i) => i.severity === 'error').length}; warnings ${mr.issues.filter((i) => i.severity === 'warning').map((i) => i.code).join(',') || 'none'}`);
console.log(`  straight -> offsets ${straight.modules.map((m) => m.wallOffset).join(',')} errors ${straight.issues.filter((i) => i.severity === 'error').length}`);
console.log(`  p-shape  -> ${pshape.occupancy.map((o) => `${o.wallId} usable=${Math.round(o.usable)}`).join(' ')}; errors ${pshape.issues.filter((i) => i.severity === 'error').length}`);
