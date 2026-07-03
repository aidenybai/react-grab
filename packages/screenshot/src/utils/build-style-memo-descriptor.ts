// Every attribute participates in the key: presentational attributes (img
// width, td align, dir, hidden, ...) feed UA styling without appearing in any
// author stylesheet. Inline declarations of per-element props are excluded
// because those props are re-read fresh on every memo hit, which lets elements
// differing only by an inline size/position share a snapshot.
export const buildStyleMemoDescriptor = (
  element: HTMLElement,
  perElementProps: ReadonlySet<string>,
): string => {
  let descriptor = element.localName;
  const attributes = element.attributes;
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
    const attribute = attributes[attributeIndex];
    if (attribute.name === "style") continue;
    descriptor += `|${attribute.name}=${attribute.value}`;
  }
  const inlineStyle = element.style;
  for (let propertyIndex = 0; propertyIndex < inlineStyle.length; propertyIndex++) {
    const propertyName = inlineStyle.item(propertyIndex);
    if (perElementProps.has(propertyName)) continue;
    descriptor += `|${propertyName}:${inlineStyle.getPropertyValue(propertyName)}!${inlineStyle.getPropertyPriority(propertyName)}`;
  }
  return descriptor;
};
