const STACKING_PROPS =
  /\b(?:position|z-index|opacity|transform|mix-blend-mode|filter|isolation|clip-path|backdrop-filter|perspective|contain)\b/;

const getParentElement = (node: Element): Element | null => {
  const parentNode = node.parentNode;
  const shadowHost = parentNode && "host" in parentNode ? (parentNode as ShadowRoot).host : null;
  return shadowHost ?? node.parentElement;
};

const getAncestorChain = (node: Element): Element[] => {
  const ancestors: Element[] = [];
  let current: Element | null = node;
  while (current) {
    ancestors.push(current);
    current = getParentElement(current);
  }
  return ancestors;
};

const isFlexOrGridItem = (node: Element): boolean => {
  const parentElement = getParentElement(node);
  if (!parentElement) return false;
  const display = getComputedStyle(parentElement).display;
  return (
    display === "flex" ||
    display === "inline-flex" ||
    display === "grid" ||
    display === "inline-grid"
  );
};

const hasPaintContainment = (containValue: string): boolean => {
  if (containValue === "none" || containValue === "size" || containValue === "layout") return false;
  return (
    containValue === "paint" ||
    containValue === "strict" ||
    containValue === "content" ||
    containValue.includes("paint")
  );
};

const isStackingContext = (node: Element, style: CSSStyleDeclaration): boolean => {
  if (style.position === "fixed" || style.position === "sticky") return true;
  if (style.zIndex !== "auto" && (style.position !== "static" || isFlexOrGridItem(node)))
    return true;
  if (+style.opacity < 1) return true;
  if (style.transform !== "none") return true;
  if ("mixBlendMode" in style && style.mixBlendMode !== "normal") return true;
  if (style.filter !== "none") return true;
  if ("isolation" in style && style.getPropertyValue("isolation") === "isolate") return true;
  if (hasPaintContainment(style.contain)) return true;
  if ("backdropFilter" in style && style.getPropertyValue("backdrop-filter") !== "none")
    return true;
  if (style.perspective !== "none") return true;
  if ("clipPath" in style && style.getPropertyValue("clip-path") !== "none") return true;
  if (STACKING_PROPS.test(style.willChange)) return true;
  return false;
};

const getNearestStackingContextZIndex = (ancestors: Element[]): number => {
  let ancestorIndex = ancestors.length;
  while (ancestorIndex--) {
    const style = getComputedStyle(ancestors[ancestorIndex]);
    if (isStackingContext(ancestors[ancestorIndex], style)) {
      return Number(style.zIndex) || 0;
    }
  }
  return 0;
};

export const compareStackingOrder = (elementA: Element, elementB: Element): number => {
  if (elementA === elementB) return 0;

  const ancestorsA = getAncestorChain(elementA);
  const ancestorsB = getAncestorChain(elementB);

  let commonAncestor: Element | undefined;

  while (ancestorsA.at(-1) === ancestorsB.at(-1)) {
    commonAncestor = ancestorsA.pop()!;
    ancestorsB.pop();
  }

  if (ancestorsA.length === 0) return -1;
  if (ancestorsB.length === 0) return 1;

  const zIndexA = getNearestStackingContextZIndex(ancestorsA);
  const zIndexB = getNearestStackingContextZIndex(ancestorsB);

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
