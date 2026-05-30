import { EDIT_TEXT_CONTENT_MAX_LENGTH } from "../constants.js";

// Returns the element's text when it is a "text leaf" — every child is
// a text node — so replacing textContent can't clobber nested elements.
// Bails on empty/whitespace-only text and on long blocks (likely
// composed content) so the panel only offers editing where a single
// textContent swap is unambiguous.
export const getEditableTextContent = (element: Element): string | null => {
  const { childNodes } = element;
  if (childNodes.length === 0) return null;
  for (let childIndex = 0; childIndex < childNodes.length; childIndex++) {
    if (childNodes[childIndex].nodeType !== Node.TEXT_NODE) return null;
  }
  const textContent = element.textContent ?? "";
  if (textContent.trim().length === 0) return null;
  if (textContent.length > EDIT_TEXT_CONTENT_MAX_LENGTH) return null;
  return textContent;
};
