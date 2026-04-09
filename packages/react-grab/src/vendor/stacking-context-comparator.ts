// Stacking context comparator: determines which of two elements is
// visually in front by walking ancestor chains, comparing z-index
// within stacking contexts, and falling back to DOM sibling order.
// MIT License, https://github.com/Rich-Harris/stacking-order

const STACKING_CONTEXT_PROPERTIES = /\b(?:position|zIndex|opacity|transform|mixBlendMode|filter|isolation)\b/;

const getParent = (node: Element): Element | null => {
  const parentNode = node.parentNode;
  const shadowHost = parentNode && "host" in parentNode ? (parentNode as ShadowRoot).host : null;
  return shadowHost ?? node.parentElement;
};

const getAncestors = (node: Element): Element[] => {
  const ancestors: Element[] = [];
  let current: Element | null = node;
  while (current) {
    ancestors.push(current);
    current = getParent(current);
  }
  return ancestors;
};

const isFlexItem = (node: Element): boolean => {
  const parentElement = getParent(node);
  if (!parentElement) return false;
  const display = getComputedStyle(parentElement).display;
  return display === "flex" || display === "inline-flex";
};

const createsStackingContext = (node: Element): boolean => {
  const style = getComputedStyle(node);

  if (style.position === "fixed") return true;
  if ((style.zIndex !== "auto" && style.position !== "static") || isFlexItem(node)) return true;
  if (+style.opacity < 1) return true;
  if (style.transform !== "none") return true;
  if ("mixBlendMode" in style && style.mixBlendMode !== "normal") return true;
  if (style.filter !== "none") return true;
  if ("isolation" in style && style.getPropertyValue("isolation") === "isolate") return true;
  if (STACKING_CONTEXT_PROPERTIES.test(style.willChange)) return true;

  return false;
};

const findStackingContext = (ancestors: Element[]): Element | null => {
  let ancestorIndex = ancestors.length;
  while (ancestorIndex--) {
    if (createsStackingContext(ancestors[ancestorIndex])) return ancestors[ancestorIndex];
  }
  return null;
};

const getZIndex = (node: Element | null): number =>
  (node && Number(getComputedStyle(node).zIndex)) || 0;

export const compareStackingOrder = (elementA: Element, elementB: Element): number => {
  if (elementA === elementB) return 0;

  const ancestorsA = getAncestors(elementA);
  const ancestorsB = getAncestors(elementB);

  let commonAncestor: Element | undefined;

  while (ancestorsA.at(-1) === ancestorsB.at(-1)) {
    commonAncestor = ancestorsA.pop()!;
    ancestorsB.pop();
  }

  const zIndexA = getZIndex(findStackingContext(ancestorsA));
  const zIndexB = getZIndex(findStackingContext(ancestorsB));

  if (zIndexA === zIndexB) {
    if (!commonAncestor) return 0;
    const children = commonAncestor.childNodes;
    const furthestAncestorA = ancestorsA.at(-1);
    const furthestAncestorB = ancestorsB.at(-1);

    let childIndex = children.length;
    while (childIndex--) {
      const child = children[childIndex];
      if (child === furthestAncestorA) return 1;
      if (child === furthestAncestorB) return -1;
    }
  }

  return Math.sign(zIndexA - zIndexB);
};
