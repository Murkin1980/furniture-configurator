/**
 * Placement mutation API (CP-02 §2).
 *
 * Small, deterministic operations suitable for a future drag-and-drop UI. The
 * UI must not own placement logic: every operation only edits the canonical
 * model (modules + runs) and returns `{ definition, derived }` rebuilt by
 * buildProject(), so coordinates are always re-derived.
 *
 *   place   - add a module to a run
 *   remove  - delete a module
 *   reorder - move a module within its run
 *   move    - move a module to another run (or another index)
 *
 * Invalid operations throw descriptive errors (surfaced by tests/UI as
 * validation, CP-02 §5).
 */

import { normalizeProject } from '../model/runs.js';
import { buildProject } from '../model/project.js';

function baseRuns(def) {
  return normalizeProject(def).runs.map((r) => ({ ...r, moduleIds: [...r.moduleIds] }));
}

function wallExists(def, wallId) {
  return def.room.walls.some((w) => w.id === wallId);
}

function findRun(runs, moduleId) {
  return runs.find((r) => r.moduleIds.includes(moduleId)) ?? null;
}

function rebuild(def) {
  return { definition: def, derived: buildProject(def) };
}

/** Add a module to a run (appended unless `index` given). */
export function placeModule(def, module, { wallId, index } = {}) {
  if (!module?.id) throw new Error('placeModule: module needs an id');
  if (def.modules.some((m) => m.id === module.id)) {
    throw new Error(`placeModule: module "${module.id}" already exists - use move/reorder`);
  }
  const target = wallId ?? module.wallId;
  if (!target || !wallExists(def, target)) {
    throw new Error(`placeModule: invalid wall reference "${target}"`);
  }
  const runs = baseRuns(def);
  let run = runs.find((r) => r.wallId === target);
  if (!run) {
    run = { wallId: target, startPoint: 'start', moduleIds: [] };
    runs.push(run);
  }
  const at = index === undefined ? run.moduleIds.length : index;
  if (at < 0 || at > run.moduleIds.length) {
    throw new Error(`placeModule: index ${at} out of range for run "${target}"`);
  }
  run.moduleIds.splice(at, 0, module.id);

  const { wallId: _w, autoOffset: _a, ...dims } = module;
  const next = { ...def, runs, modules: [...def.modules, { ...dims, type: dims.type ?? 'base-cabinet' }] };
  return rebuild(next);
}

/** Remove a module from the project and from any run. */
export function removeModule(def, moduleId) {
  if (!def.modules.some((m) => m.id === moduleId)) {
    throw new Error(`removeModule: no module "${moduleId}"`);
  }
  const runs = baseRuns(def)
    .map((r) => ({ ...r, moduleIds: r.moduleIds.filter((id) => id !== moduleId) }))
    .filter((r) => r.moduleIds.length || def.runs); // keep empty authored runs
  const next = { ...def, runs, modules: def.modules.filter((m) => m.id !== moduleId) };
  return rebuild(next);
}

/** Move a module within its own run to a new index. */
export function reorderModule(def, moduleId, newIndex) {
  const runs = baseRuns(def);
  const run = findRun(runs, moduleId);
  if (!run) throw new Error(`reorderModule: module "${moduleId}" is not in any run`);
  const from = run.moduleIds.indexOf(moduleId);
  if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= run.moduleIds.length) {
    throw new Error(`reorderModule: index ${newIndex} out of range for run "${run.wallId}"`);
  }
  run.moduleIds.splice(from, 1);
  run.moduleIds.splice(newIndex, 0, moduleId);
  return rebuild({ ...def, runs });
}

/** Move a module to another run (or another index in the same run). */
export function moveModule(def, moduleId, { wallId, index } = {}) {
  if (!def.modules.some((m) => m.id === moduleId)) {
    throw new Error(`moveModule: no module "${moduleId}"`);
  }
  if (!wallId || !wallExists(def, wallId)) {
    throw new Error(`moveModule: invalid wall reference "${wallId}"`);
  }
  const runs = baseRuns(def);
  const from = findRun(runs, moduleId);
  if (from) from.moduleIds.splice(from.moduleIds.indexOf(moduleId), 1);
  let to = runs.find((r) => r.wallId === wallId);
  if (!to) {
    to = { wallId, startPoint: 'start', moduleIds: [] };
    runs.push(to);
  }
  const at = index === undefined ? to.moduleIds.length : index;
  if (at < 0 || at > to.moduleIds.length) {
    throw new Error(`moveModule: index ${at} out of range for run "${wallId}"`);
  }
  to.moduleIds.splice(at, 0, moduleId);
  return rebuild({ ...def, runs });
}
