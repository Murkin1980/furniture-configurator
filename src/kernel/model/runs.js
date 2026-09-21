/**
 * Canonical furniture `runs` (CP-02 §1).
 *
 * A run is an ordered list of module IDs standing on one wall:
 *
 *   Run { wallId, startPoint?: 'start'|'end', moduleIds: string[] }
 *
 * The kernel accepts two equivalent definition styles and normalises both to
 * runs:
 *
 *   - CP-02 style: `definition.runs` with explicit `moduleIds` (modules carry
 *     dimensions only);
 *   - CP-01 style: modules carry `wallId` and array order (runs are derived by
 *     grouping, so the existing CP-01 fixture passes unchanged).
 *
 * Normalisation never computes coordinates - it only establishes wall
 * assignment and ordering. Real coordinates stay derived in placement.
 */

/**
 * @param {object} def canonical project definition
 * @returns {{ runs: Array, modules: Array }} ordered modules (wallId resolved)
 *   plus the run descriptors (with `startPoint`).
 */
export function normalizeProject(def) {
  const byId = new Map(def.modules.map((m) => [m.id, m]));

  if (Array.isArray(def.runs) && def.runs.length) {
    return normalizeFromRuns(def, byId);
  }
  return normalizeFromModuleWalls(def);
}

function normalizeFromRuns(def, byId) {
  const seen = new Set();
  const runs = def.runs.map((run) => {
    if (!run.wallId) throw new Error('normalizeProject: a run must reference a wallId');
    if (!def.room.walls.some((w) => w.id === run.wallId)) {
      throw new Error(`normalizeProject: run references unknown wall "${run.wallId}"`);
    }
    // A run may declare its module order explicitly, or (hybrid) only set the
    // fill direction and inherit order from modules that carry its wallId.
    const declared =
      run.moduleIds ??
      def.modules.filter((m) => m.wallId === run.wallId).map((m) => m.id);
    const moduleIds = [];
    for (const id of declared) {
      if (!byId.has(id)) throw new Error(`normalizeProject: run "${run.wallId}" references unknown module "${id}"`);
      if (seen.has(id)) throw new Error(`normalizeProject: module "${id}" appears in more than one run`);
      seen.add(id);
      moduleIds.push(id);
    }
    return { wallId: run.wallId, startPoint: run.startPoint ?? 'start', moduleIds };
  });

  const unplaced = def.modules.filter((m) => !seen.has(m.id));
  if (unplaced.length) {
    throw new Error(
      `normalizeProject: modules not assigned to any run: ${unplaced.map((m) => m.id).join(', ')}`,
    );
  }

  const modules = runs.flatMap((run) =>
    run.moduleIds.map((id) => {
      const m = byId.get(id);
      return { ...m, wallId: run.wallId, autoOffset: m.autoOffset ?? m.wallOffset === undefined };
    }),
  );
  return { runs, modules };
}

function normalizeFromModuleWalls(def) {
  const order = [];
  const byWall = new Map();
  for (const m of def.modules) {
    if (!def.room.walls.some((w) => w.id === m.wallId)) {
      throw new Error(`normalizeProject: module "${m.id}" references unknown wall "${m.wallId}"`);
    }
    if (!byWall.has(m.wallId)) {
      byWall.set(m.wallId, []);
      order.push(m.wallId);
    }
    byWall.get(m.wallId).push(m.id);
  }
  const runs = order.map((wallId) => ({ wallId, startPoint: 'start', moduleIds: byWall.get(wallId) }));
  // Modules already carry wallId; keep their authored order/offsets.
  return { runs, modules: def.modules.map((m) => ({ ...m })) };
}

/** Runs as the startPoint-only list consumed by the packer. */
export const runsStartPoints = (runs) =>
  runs.map((r) => ({ wallId: r.wallId, startPoint: r.startPoint }));
