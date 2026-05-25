export interface CoordinationFlags {
  /** Read the currently keyboard-selected element (set via arrow nav). */
  getKeyboardSelectedElement: () => Element | null;
  /** Replace the keyboard-selected element. */
  setKeyboardSelectedElement: (element: Element | null) => void;
  /** Read+clear the keyboard-selected element in one step. */
  takeKeyboardSelectedElement: () => Element | null;
  /** Read the pending-default-action id without consuming it. */
  peekPendingDefaultActionId: () => string | null;
  /** Set the pending-default-action id (or null to clear). */
  setPendingDefaultActionId: (actionId: string | null) => void;
  /** Read+clear the pending-default-action id. */
  takePendingDefaultActionId: () => string | null;
}

/**
 * Two small mutable flags shared across init's subsystems. They live in
 * one place so their lifecycle is easy to audit:
 *
 *   - `keyboardSelectedElement` — the element the arrow-nav menu most
 *     recently focused. Drag handlers + the context-menu action-context
 *     consume it via `take`/`set(null)` so a subsequent click doesn't
 *     snap back to a stale anchor.
 *
 *   - `pendingDefaultActionId` — set by `handleToggleActive` when the
 *     toolbar's configured default-action is non-default; consumed by
 *     the next click via `take` to fire that action against the picked
 *     element. Reset to null after consumption.
 */
export const createCoordinationFlags = (): CoordinationFlags => {
  let keyboardSelectedElement: Element | null = null;
  let pendingDefaultActionId: string | null = null;

  return {
    getKeyboardSelectedElement: () => keyboardSelectedElement,
    setKeyboardSelectedElement: (element) => {
      keyboardSelectedElement = element;
    },
    takeKeyboardSelectedElement: () => {
      const element = keyboardSelectedElement;
      keyboardSelectedElement = null;
      return element;
    },
    peekPendingDefaultActionId: () => pendingDefaultActionId,
    setPendingDefaultActionId: (actionId) => {
      pendingDefaultActionId = actionId;
    },
    takePendingDefaultActionId: () => {
      const id = pendingDefaultActionId;
      pendingDefaultActionId = null;
      return id;
    },
  };
};
