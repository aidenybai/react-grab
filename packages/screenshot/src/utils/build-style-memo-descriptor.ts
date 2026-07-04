import { isMemoCarriedInlineDeclaration } from "./is-memo-carried-inline-declaration";

// Attributes participate in the key only when they can affect styling:
// presentational attributes (img width, td align, dir, hidden, ...) feed UA
// styling without appearing in any author stylesheet, and attribute/id
// selectors found in the CSS scan extend the set. Purely semantic attributes
// (data-*, aria-*, ids without #-selectors) are excluded so elements
// differing only by them share a snapshot. Inline declarations of
// per-element props are excluded because those props are re-read fresh on
// every memo hit, which lets elements differing only by an inline
// size/position share a snapshot.
export const buildStyleMemoDescriptor = (
  element: HTMLElement,
  perElementProps: ReadonlySet<string>,
  styleRelevantAttributeNames: ReadonlySet<string> | null,
  useInlineCarryMarkers: boolean,
): string => {
  let descriptor = element.localName;
  const attributes = element.attributes;
  // A shadow host's internal sheet can target any host attribute via
  // :host([...]), so hosts keep every attribute in the key.
  const includeAllAttributes = styleRelevantAttributeNames === null || element.shadowRoot !== null;
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
    const attribute = attributes[attributeIndex];
    const attributeName = attribute.name;
    if (attributeName === "style") continue;
    if (!includeAllAttributes && !styleRelevantAttributeNames.has(attributeName)) continue;
    descriptor += `|${attributeName}=${attribute.value}`;
  }
  if (element.hasAttribute("style")) {
    const inlineStyle = element.style;
    for (let propertyIndex = 0; propertyIndex < inlineStyle.length; propertyIndex++) {
      const propertyName = inlineStyle.item(propertyIndex);
      if (perElementProps.has(propertyName)) continue;
      const propertyValue = inlineStyle.getPropertyValue(propertyName);
      const propertyPriority = inlineStyle.getPropertyPriority(propertyName);
      // Carried declarations key by name only: their values ride on the
      // clone's style attribute, so elements differing only in those values
      // share a snapshot.
      if (
        useInlineCarryMarkers &&
        isMemoCarriedInlineDeclaration(propertyName, propertyValue, propertyPriority)
      ) {
        descriptor += `|~${propertyName}`;
        continue;
      }
      descriptor += `|${propertyName}:${propertyValue}!${propertyPriority}`;
    }
  }
  return descriptor;
};
