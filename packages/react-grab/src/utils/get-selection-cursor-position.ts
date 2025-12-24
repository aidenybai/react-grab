import { isSelectionBackward } from "./is-selection-backward.js";

export const getSelectionCursorPosition = (selection: Selection) => {
  const range = selection.getRangeAt(0);
  const clientRects = range.getClientRects();
  if (clientRects.length === 0) return null;

  const isBackward = isSelectionBackward(selection);
  const cursorRect = isBackward
    ? clientRects[0]
    : clientRects[clientRects.length - 1];

  return {
    x: isBackward ? cursorRect.left : cursorRect.right,
    y: cursorRect.top + cursorRect.height / 2,
  };
};
