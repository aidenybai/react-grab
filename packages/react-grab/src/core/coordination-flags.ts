export interface CoordinationFlags {
  /** Read the currently keyboard-selected element (set via arrow nav). */
  getKeyboardSelectedElement: () => Element | null;
  /** Replace the keyboard-selected element. */
  setKeyboardSelectedElement: (element: Element | null) => void;
  /** Read+clear the keyboard-selected element in one step. */
  takeKeyboardSelectedElement: () => Element | null;
}

/**
 * One small mutable flag shared across init's subsystems: the element the
 * arrow-nav menu most recently focused. Drag handlers + the context-menu
 * action-context consume it via `take`/`set(null)` so a subsequent click
 * doesn't snap back to a stale anchor.
 *
 * The activation-intent flags previously colocated here moved to the
 * `store.activationIntent` discriminated union.
 */
export const createCoordinationFlags = (): CoordinationFlags => {
  let keyboardSelectedElement: Element | null = null;

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
  };
};
