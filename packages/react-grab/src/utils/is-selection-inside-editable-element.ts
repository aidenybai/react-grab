const isEditableElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea") {
    return true;
  }
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }
  return false;
};

export const isSelectionInsideEditableElement = (
  cursorX?: number,
  cursorY?: number,
): boolean => {
  const activeElement = document.activeElement;

  if (activeElement) {
    let current: Element | null = activeElement;
    while (current) {
      if (isEditableElement(current)) {
        return true;
      }
      current = current.parentElement;
    }
  }

  if (cursorX !== undefined && cursorY !== undefined) {
    const elementsAtPoint = document.elementsFromPoint(cursorX, cursorY);
    for (const element of elementsAtPoint) {
      if (isEditableElement(element)) {
        return true;
      }
    }
  }

  return false;
};
