const CSS_VAR_KEY_PROPERTIES = ["fill", "stroke", "color", "background-color", "stop-color"];

const baselineCache = new Map<string, Record<string, string>>();

const computeBaselineStylesForTag = (tagName: string, namespaceUri: string): Record<string, string> => {
  const cacheKey = `${namespaceUri}::${tagName.toLowerCase()}`;
  const cached = baselineCache.get(cacheKey);
  if (cached) return cached;

  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;left:-99999px;top:-99999px;contain:strict;display:block;";

  const baselineElement =
    namespaceUri === "http://www.w3.org/2000/svg"
      ? document.createElementNS(namespaceUri, tagName)
      : document.createElement(tagName);

  holder.appendChild(baselineElement);
  document.documentElement.appendChild(holder);

  const computed = getComputedStyle(baselineElement);
  const baseline: Record<string, string> = {};
  for (const property of CSS_VAR_KEY_PROPERTIES) {
    baseline[property] = computed.getPropertyValue(property) || "";
  }

  holder.remove();
  baselineCache.set(cacheKey, baseline);
  return baseline;
};

export const resolveElementCssVars = (
  sourceElement: Element,
  styles: Record<string, string>,
): void => {
  const styleAttribute = sourceElement.getAttribute("style") || "";
  const hasInlineVar = styleAttribute.includes("var(");

  let hasAttributeVar = false;
  if (!hasInlineVar && sourceElement.attributes.length) {
    for (let index = 0; index < sourceElement.attributes.length; index++) {
      const attribute = sourceElement.attributes[index];
      if (attribute.value.includes("var(")) {
        hasAttributeVar = true;
        break;
      }
    }
  }

  if (hasInlineVar || hasAttributeVar) {
    const computed = getComputedStyle(sourceElement);
    const authorStyle = sourceElement instanceof HTMLElement ? sourceElement.style : null;

    if (authorStyle) {
      for (let index = 0; index < authorStyle.length; index++) {
        const property = authorStyle[index];
        const value = authorStyle.getPropertyValue(property);
        if (!value?.includes("var(")) continue;
        const resolvedValue = computed.getPropertyValue(property);
        if (resolvedValue) {
          styles[property] = resolvedValue.trim();
        }
      }
    }

    for (let index = 0; index < sourceElement.attributes.length; index++) {
      const attribute = sourceElement.attributes[index];
      if (!attribute.value.includes("var(")) continue;
      const resolvedValue = computed.getPropertyValue(attribute.name);
      if (resolvedValue) {
        styles[attribute.name] = resolvedValue.trim();
      }
    }
    return;
  }

  const computed = getComputedStyle(sourceElement);
  const namespaceUri = sourceElement.namespaceURI || "html";
  const baseline = computeBaselineStylesForTag(sourceElement.tagName, namespaceUri);

  for (const property of CSS_VAR_KEY_PROPERTIES) {
    const currentValue = computed.getPropertyValue(property) || "";
    const baselineValue = baseline[property] || "";
    if (currentValue && currentValue !== baselineValue) {
      styles[property] = currentValue.trim();
    }
  }
};

export const disposeVarBaseline = (): void => {
  baselineCache.clear();
};
