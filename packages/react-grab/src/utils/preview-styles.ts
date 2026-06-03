import type { PreviewStyles } from "../types.js";

interface InlineStyledElement extends Element {
  style: CSSStyleDeclaration;
}

interface PreviewTarget {
  element: InlineStyledElement;
  baselineStyles: Map<string, { value: string; priority: string }>;
}

const hasInlineStyle = (element: Element): element is InlineStyledElement => {
  return "style" in element && element.style instanceof CSSStyleDeclaration;
};

export const createPreviewStyles = (elements: Element | readonly Element[]): PreviewStyles => {
  const elementList = Array.isArray(elements) ? elements : [elements];
  const targets: PreviewTarget[] = [];
  for (const element of elementList) {
    if (hasInlineStyle(element)) {
      targets.push({ element, baselineStyles: new Map() });
    }
  }

  const apply = (cssProperties: readonly string[], cssValue: string): void => {
    for (const target of targets) {
      for (const cssProperty of cssProperties) {
        if (!target.baselineStyles.has(cssProperty)) {
          target.baselineStyles.set(cssProperty, {
            value: target.element.style.getPropertyValue(cssProperty),
            priority: target.element.style.getPropertyPriority(cssProperty),
          });
        }
        target.element.style.setProperty(cssProperty, cssValue);
      }
    }
  };

  const restore = (): void => {
    for (const target of targets) {
      for (const [cssProperty, { value, priority }] of target.baselineStyles) {
        if (value) {
          target.element.style.setProperty(cssProperty, value, priority);
        } else {
          target.element.style.removeProperty(cssProperty);
        }
      }
      target.baselineStyles.clear();
    }
  };

  const forget = (): void => {
    for (const target of targets) {
      target.baselineStyles.clear();
    }
  };

  const hasAppliedStyles = (): boolean => targets.some((target) => target.baselineStyles.size > 0);

  return { apply, restore, forget, hasAppliedStyles };
};
