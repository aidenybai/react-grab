// CSS used to remove an element from layout flow while keeping it in the
// DOM, so a focused textarea inside still receives keyboard events through
// the panel's compact state.
export const HIDDEN_FOCUS_PRESERVING_STYLE = {
  position: "absolute" as const,
  opacity: 0,
  "pointer-events": "none" as const,
  width: "0",
  height: "0",
  margin: "0",
  padding: "0",
  overflow: "hidden" as const,
};
