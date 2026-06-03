import { ELEMENT_DESCRIPTOR_TEXT_MAX_LENGTH } from "../constants.js";

// A short, human/agent-readable handle for an element used in the DOM-move
// instruction, e.g. `<button.cta "Submit">`. Intentionally selector-ish rather
// than a precise CSS selector — it just needs to identify the reference node.
export const describeElementForPrompt = (element: Element): string => {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const firstClass = element.classList[0] ? `.${element.classList[0]}` : "";
  const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
  const snippet =
    text.length > 0
      ? ` "${text.slice(0, ELEMENT_DESCRIPTOR_TEXT_MAX_LENGTH)}${text.length > ELEMENT_DESCRIPTOR_TEXT_MAX_LENGTH ? "…" : ""}"`
      : "";
  return `<${tag}${id}${firstClass}>${snippet}`;
};
