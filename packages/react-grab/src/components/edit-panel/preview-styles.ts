// Writes inline-style overrides on an element while remembering the
// previous value (and !important priority) of each touched property, so
// they can be reverted exactly on dismiss without clobbering author
// inline styles that were already there. Element is bound at construction
// because the panel never retargets mid-lifetime.
// Anything that exposes a writable inline `.style` is a valid target:
// HTMLElement, SVGElement, MathMLElement, and any web component whose
// base extends one of them. Capability check (does the node have a
// CSSStyleDeclaration?) rather than instanceof narrowing — the latter
// silently no-ops for exotic element classes that still own a `style`.
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

  // Drops bookkeeping without removing the styles we wrote — used on
  // commit, so subsequent edits treat the just-committed state as the
  // new baseline rather than the pre-edit one.
  const forget = (): void => {
    baseline.clear();
  };

  const hasAppliedStyles = (): boolean => baseline.size > 0;

  return { apply, restore, forget, hasAppliedStyles };
};
