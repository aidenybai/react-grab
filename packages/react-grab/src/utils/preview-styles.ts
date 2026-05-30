import type { PreviewStyles } from "../types.js";

interface InlineStyledElement extends Element {
  style: CSSStyleDeclaration;
}

const hasInlineStyle = (element: Element): element is InlineStyledElement => {
  return "style" in element && element.style instanceof CSSStyleDeclaration;
};

export const createPreviewStyles = (element: Element): PreviewStyles => {
  const baselineStyles = new Map<string, { value: string; priority: string }>();
  const styledElement = hasInlineStyle(element) ? element : null;
  let baselineText: string | null = null;

  const apply = (cssProperties: readonly string[], cssValue: string): void => {
    if (!styledElement) return;
    for (const cssProperty of cssProperties) {
      if (!baselineStyles.has(cssProperty)) {
        baselineStyles.set(cssProperty, {
          value: styledElement.style.getPropertyValue(cssProperty),
          priority: styledElement.style.getPropertyPriority(cssProperty),
        });
      }
      styledElement.style.setProperty(cssProperty, cssValue);
    }
  };

  const applyText = (text: string): void => {
    if (baselineText === null) baselineText = element.textContent ?? "";
    element.textContent = text;
  };

  const restore = (): void => {
    if (baselineText !== null) {
      element.textContent = baselineText;
      baselineText = null;
    }
    if (!styledElement) {
      baselineStyles.clear();
      return;
    }
    for (const [cssProperty, { value, priority }] of baselineStyles) {
      if (value) {
        styledElement.style.setProperty(cssProperty, value, priority);
      } else {
        styledElement.style.removeProperty(cssProperty);
      }
    }
    baselineStyles.clear();
  };

  const forget = (): void => {
    baselineStyles.clear();
    baselineText = null;
  };

  const hasAppliedStyles = (): boolean => baselineStyles.size > 0 || baselineText !== null;

  return { apply, applyText, restore, forget, hasAppliedStyles };
};
