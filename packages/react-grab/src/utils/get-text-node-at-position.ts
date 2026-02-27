const hasElementChild = (parent: Element): boolean => {
  const childNodes = parent.childNodes;
  for (let index = 0; index < childNodes.length; index++) {
    if (childNodes[index].nodeType === Node.ELEMENT_NODE) {
      return true;
    }
  }
  return false;
};

export const getTextNodeAtPosition = (
  clientX: number,
  clientY: number,
  parentElement: Element,
): Text | null => {
  const range = document.caretRangeFromPoint(clientX, clientY);
  if (!range) return null;

  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return null;

  const textNode = container as Text;
  if (textNode.parentElement !== parentElement) return null;

  const trimmedContent = textNode.textContent?.trim();
  if (!trimmedContent || trimmedContent.length === 0) return null;

  if (!hasElementChild(parentElement)) return null;

  return textNode;
};
