/**
 * Ergonomics/installation checklist (CP-11) - derived validation readouts.
 *
 * Mirrors the numeric rules GrabSketch's help documents (checklist thresholds)
 * but computes them ONLY from the kernel bundle, in line with the one-way flow.
 * Rules the canonical model cannot express are reported as 'na' (not modelled)
 * rather than faked - UNKNOWN/na is acceptable, fabricated certainty is not.
 */

export const CHECKLIST_LIMITS = {
  baseDepthMin: 560,
  topDepthMin: 300,
  topDepthMax: 400,
  cornerFacadeMin: 500,
  worktopMin: 850,
  worktopMax: 920,
  sinkMin: 600,
};

/**
 * @param {object} bundle output of buildProject()
 * @returns {Array<{id:string, status:'pass'|'fail'|'na', message:string}>}
 */
export function checklist(bundle) {
  const L = CHECKLIST_LIMITS;
  const items = [];
  const errors = bundle.issues.filter((i) => i.severity === 'error');
  const warnings = bundle.issues.filter((i) => i.severity === 'warning');

  // 1. Kitchen fits the room: no overflow issues and no module above ceiling.
  const overflow = errors.filter((i) => i.code === 'CANNOT_PLACE' || i.code === 'OUT_OF_WALL');
  const tooTall = bundle.modules.filter((m) => m.height > bundle.room.height);
  items.push({
    id: 'fits-room',
    status: overflow.length || tooTall.length ? 'fail' : 'pass',
    message: overflow.length
      ? `run overflows wall: ${overflow.map((i) => i.subject).join(', ')}`
      : tooTall.length
        ? `module taller than room: ${tooTall.map((m) => m.id).join(', ')}`
        : 'runs fit their walls; nothing above the ceiling',
  });

  // 2. No gaps between cabinets inside runs.
  const gaps = warnings.filter((i) => i.code === 'RUN_GAP');
  items.push({
    id: 'no-gaps',
    status: gaps.length ? 'fail' : 'pass',
    message: gaps.length
      ? `${gaps.length} gap(s) between cabinets: ${gaps.map((g) => g.subject).join(', ')}`
      : 'no gaps between cabinets',
  });

  // 3. Bottom cabinet depth >= 560.
  const shallow = bundle.modules.filter((m) => m.type === 'base-cabinet' && m.depth < L.baseDepthMin);
  items.push({
    id: 'base-depth',
    status: shallow.length ? 'fail' : 'pass',
    message: shallow.length
      ? `bottom depth < ${L.baseDepthMin}: ${shallow.map((m) => `${m.id}=${m.depth}`).join(', ')}`
      : `all bottom cabinets >= ${L.baseDepthMin} deep`,
  });

  // 4. Top cabinet depth 300..400 (n/a when the project has none).
  const tops = bundle.modules.filter((m) => m.type === 'wall-cabinet');
  const badTops = tops.filter((m) => m.depth < L.topDepthMin || m.depth > L.topDepthMax);
  items.push({
    id: 'top-depth',
    status: tops.length ? (badTops.length ? 'fail' : 'pass') : 'na',
    message: tops.length
      ? badTops.length
        ? `top depth outside ${L.topDepthMin}-${L.topDepthMax}: ${badTops.map((m) => `${m.id}=${m.depth}`).join(', ')}`
        : `top cabinets within ${L.topDepthMin}-${L.topDepthMax}`
      : 'no top cabinets in project',
  });

  // 5. Corner facade >= 500 - applies to declared corner cabinets only; the
  //    module that merely closes a corner is not a corner facade, so projects
  //    without one report 'na' (no fabricated certainty).
  const narrow = [];
  let hasCorner = false;
  for (const c of bundle.corners) {
    if (!c.occupancy) continue;
    const m = bundle.modules.find((x) => x.id === c.occupancy.moduleId);
    if (m && m.type === 'base-cabinet' && m.parameters?.corner) {
      hasCorner = true;
      if (m.width < L.cornerFacadeMin) narrow.push(`${m.id}=${m.width}`);
    }
  }
  items.push({
    id: 'corner-facade',
    status: hasCorner ? (narrow.length ? 'fail' : 'pass') : 'na',
    message: hasCorner
      ? narrow.length
        ? `corner facade < ${L.cornerFacadeMin}: ${narrow.join(', ')}`
        : `corner facades >= ${L.cornerFacadeMin}`
      : 'no declared corner cabinet',
  });

  // 6. Worktop top 850..920 - now derived from base runs + plinth + thickness.
  const worktops = bundle.worktops ?? [];
  if (!worktops.length) {
    items.push({ id: 'worktop-height', status: 'na', message: 'no base run to derive a worktop from' });
  } else {
    const unlevel = worktops.filter((w) => !w.level);
    const out = worktops.filter((w) => w.level && (w.topZ < L.worktopMin || w.topZ > L.worktopMax));
    const status = unlevel.length || out.length ? 'fail' : 'pass';
    items.push({
      id: 'worktop-height',
      status,
      message: unlevel.length
        ? `unlevel base run(s): ${unlevel.map((w) => w.wallId).join(', ')}`
        : out.length
          ? `worktop top outside ${L.worktopMin}-${L.worktopMax}: ${out.map((w) => `${w.wallId}=${w.topZ}`).join(', ')}`
          : `worktop top within ${L.worktopMin}-${L.worktopMax} on every base run`,
    });
  }

  // 7. Sink cabinet >= 600 - only when a module declares a sink.
  const sinks = bundle.modules.filter((m) => m.parameters?.sink);
  const badSink = sinks.filter((m) => m.width < L.sinkMin);
  items.push({
    id: 'sink-width',
    status: sinks.length ? (badSink.length ? 'fail' : 'pass') : 'na',
    message: sinks.length
      ? badSink.length
        ? `sink cabinet < ${L.sinkMin}: ${badSink.map((m) => `${m.id}=${m.width}`).join(', ')}`
        : 'sink cabinets >= 600'
      : 'no sink declared',
  });

  return items;
}
