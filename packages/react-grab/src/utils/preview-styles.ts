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

  const restore = (): void => {
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

  const hasAppliedStyles = (): boolean => baselineStyles.size > 0;

  return { apply, restore, hasAppliedStyles };
};
