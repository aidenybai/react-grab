export const isSelectionBackward = (selection: Selection): boolean => {
  if (!selection.anchorNode || !selection.focusNode) return false;
  const position = selection.anchorNode.compareDocumentPosition(
    selection.focusNode,
  );
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return false;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return true;
  return selection.anchorOffset > selection.focusOffset;
};

