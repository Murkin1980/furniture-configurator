/**
 * Editor actions (CP-04) - pure canonical-model rewrites.
 *
 * A thin, deterministic dispatcher that expresses every UI edit as one of a
 * small set of actions applied THROUGH the CP-02 placement API and the CP-01
 * update* functions. The UI (kernel-preview.html) owns no placement logic: it
 * sends actions here and re-renders whatever buildProject() derives.
 *
 *   applyAction(definition, action) -> nextDefinition
 *
 * Actions:
 *   { type:'add',        module?:{id?,width?,height?,depth?,type?}, wallId, index? }
 *   { type:'remove',     moduleId }
 *   { type:'resize',     moduleId, width?|depth?|parameters? }
 *   { type:'resizeWall', wallId, patch }
 *   { type:'move',       moduleId, wallId, index? }        // between runs
 *   { type:'reorder',    moduleId, index }                 // within its run
 *   { type:'moveCorner', cornerIndex, point, snap90? }     // room-shape edit (CP-08)
 *
 * Invalid actions throw the descriptive errors raised by the underlying API
 * (CP-02 section 5), so the UI can surface them verbatim.
 */

import { placeModule, removeModule, reorderModule, moveModule } from '../placement/operations.js';
import { updateModule, updateWall } from './project.js';
import { moveCorner } from './roomedit.js';

/** Collision-free generated id (`u1`, `u2`, ...) when the action has none. */
export function nextModuleId(definition) {
  let n = 1;
  const ids = new Set(definition.modules.map((m) => m.id));
  while (ids.has(`u${n}`)) n += 1;
  return `u${n}`;
}

/**
 * @param {object} definition canonical project definition
 * @param {object} action see module docs
 * @returns {object} next canonical definition (derived data is re-built by the caller)
 */
export function applyAction(definition, action) {
  switch (action?.type) {
    case 'add': {
      const id = action.module?.id ?? nextModuleId(definition);
      const { id: _drop, ...dims } = action.module ?? {};
      return placeModule(
        definition,
        { id, type: 'base-cabinet', width: 600, height: 720, depth: 560, ...dims },
        { wallId: action.wallId, index: action.index },
      ).definition;
    }
    case 'remove':
      return removeModule(definition, action.moduleId).definition;
    case 'resize': {
      const { type: _t, moduleId, ...patch } = action;
      return updateModule(definition, moduleId, patch).definition;
    }
    case 'resizeWall':
      return updateWall(definition, action.wallId, action.patch).definition;
    case 'move':
      return moveModule(definition, action.moduleId, {
        wallId: action.wallId,
        index: action.index,
      }).definition;
    case 'reorder':
      return reorderModule(definition, action.moduleId, action.index).definition;
    case 'moveCorner':
      return moveCorner(definition, action.cornerIndex, action.point, { snap90: !!action.snap90 });
    default:
      throw new Error(`applyAction: unknown action type "${action?.type}"`);
  }
}

/** Apply a list of actions in order; deterministic replay for tests/UI undo. */
export function applyActions(definition, actions) {
  return actions.reduce((def, a) => applyAction(def, a), definition);
}
