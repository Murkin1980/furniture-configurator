/**
 * Undo/redo + persistence as action-log replay (CP-09).
 *
 * A History is `{ base, actions, redo }` - an immutable base definition plus an
 * ordered action journal. The current model is ALWAYS re-derived by replaying
 * the journal through applyActions(), so undo/redo never mutate derived state
 * and a saved journal is a complete, tiny, deterministic project document.
 *
 * Persistence is therefore trivial: serialize the history (JSON) and replay it
 * on load. The preview stores it in localStorage; any storage works.
 */

import { applyAction, applyActions } from './editor.js';

/** @param {object} base canonical definition (e.g. a fixture) */
export const createHistory = (base) => ({ base, actions: [], redo: [] });

/** Record an action (and clear redo). The caller may also apply it directly. */
export const pushAction = (history, action) => ({
  base: history.base,
  actions: [...history.actions, action],
  redo: [],
});

/** Re-derive the current definition by replaying the journal. */
export const current = (history) => applyActions(history.base, history.actions);

/** Apply one more action and record it, returning the next history. */
export const applyAndRecord = (history, action) => {
  applyAction(current(history), action); // validate/throw before recording
  return pushAction(history, action);
};

export function undo(history) {
  if (!history.actions.length) throw new Error('undo: nothing to undo');
  const last = history.actions[history.actions.length - 1];
  return {
    base: history.base,
    actions: history.actions.slice(0, -1),
    redo: [last, ...history.redo],
  };
}

export function redo(history) {
  if (!history.redo.length) throw new Error('redo: nothing to redo');
  const [first, ...rest] = history.redo;
  return { base: history.base, actions: [...history.actions, first], redo: rest };
}

/** Persistence: the journal is the whole document. */
export const serializeHistory = (history) => JSON.stringify(history);

export function deserializeHistory(str) {
  const h = JSON.parse(str);
  if (!h || typeof h !== 'object' || !h.base || !Array.isArray(h.actions)) {
    throw new Error('deserializeHistory: not a serialized history');
  }
  return { base: h.base, actions: h.actions, redo: Array.isArray(h.redo) ? h.redo : [] };
}
