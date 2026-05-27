interface InlineStyledElement extends Element {
  style: CSSStyleDeclaration;
}
const hasInlineStyle = (element: Element): element is InlineStyledElement => {
  const candidate = element as Partial<InlineStyledElement>;
  return candidate.style instanceof CSSStyleDeclaration;
};

export const createPreviewStyles = (element: Element) => {
  const baseline = new Map<string, { value: string; priority: string }>();
  const target = hasInlineStyle(element) ? element : null;

  const apply = (cssProperties: readonly string[], cssValue: string): void => {
    if (!target) return;
    for (const cssProperty of cssProperties) {
      if (!baseline.has(cssProperty)) {
        baseline.set(cssProperty, {
          value: target.style.getPropertyValue(cssProperty),
          priority: target.style.getPropertyPriority(cssProperty),
        });
      }
      target.style.setProperty(cssProperty, cssValue);
    }
  };

  const restore = (): void => {
    if (!target) {
      baseline.clear();
      return;
    }
    for (const [cssProperty, { value, priority }] of baseline) {
      if (value) {
        target.style.setProperty(cssProperty, value, priority);
      } else {
        target.style.removeProperty(cssProperty);
      }
    }
    baseline.clear();
  };

  const forget = (): void => {
    baseline.clear();
  };

  const hasAppliedStyles = (): boolean => baseline.size > 0;

  return { apply, restore, forget, hasAppliedStyles };
};
