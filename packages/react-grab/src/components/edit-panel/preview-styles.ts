// Writes inline-style overrides on an element while remembering the
// previous value (and !important priority) of each touched property, so
// they can be reverted exactly on dismiss without clobbering author
// inline styles that were already there. Element is bound at construction
// because the panel never retargets mid-lifetime.
export const createPreviewStyles = (element: Element) => {
  const baseline = new Map<string, { value: string; priority: string }>();
  // SVG icons/shapes (fill, stroke, etc.) are valid Budge targets and
  // expose `.style` the same way HTML elements do; reject only nodes
  // that have no inline-style surface (XML, MathML on older engines).
  const target = element instanceof HTMLElement || element instanceof SVGElement ? element : null;

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

  // Drops bookkeeping without removing the styles we wrote — used on
  // commit, so subsequent edits treat the just-committed state as the
  // new baseline rather than the pre-edit one.
  const forget = (): void => {
    baseline.clear();
  };

  return { apply, restore, forget };
};

export type PreviewStyles = ReturnType<typeof createPreviewStyles>;
