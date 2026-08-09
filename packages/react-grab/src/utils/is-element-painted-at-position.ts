import { getElementTextBounds } from "./get-element-text-bounds.js";

export const isElementPaintedAtPosition = (
  element: Element,
  clientX: number,
  clientY: number,
): boolean => {
  const textBounds = getElementTextBounds(element);
  if (!textBounds) return true;

  for (const textFragmentBounds of textBounds) {
    if (
      clientX >= textFragmentBounds.x &&
      clientX <= textFragmentBounds.x + textFragmentBounds.width &&
      clientY >= textFragmentBounds.y &&
      clientY <= textFragmentBounds.y + textFragmentBounds.height
    ) {
      return true;
    }
  }
  return false;
};
