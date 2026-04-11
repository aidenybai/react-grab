import { HilbertRTree } from "./hilbert-r-tree.js";
import { ELEMENT_AT_POINT_INDEX_ROOT_MARGIN_PX } from "../constants.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { compareStackingOrder } from "./compare-stacking-order.js";

interface IndexedElement {
  element: Element;
}

interface PageRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ElementAtPointIndexState {
  tree: HilbertRTree;
  elements: IndexedElement[];
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "HEAD", "META", "LINK",
  "NOSCRIPT", "BR", "TEMPLATE", "SLOT",
]);

let currentIndex: ElementAtPointIndexState | null = null;
let pendingObserver: IntersectionObserver | null = null;

export const buildElementAtPointIndex = (): void => {
  destroyElementAtPointIndex();

  let didObserveAnyElement = false;

  const accumulatedElements: IndexedElement[] = [];
  const accumulatedRects: PageRect[] = [];

  const observer = new IntersectionObserver(
    (entries) => {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      for (const entry of entries) {
        observer.unobserve(entry.target);

        const targetElement = entry.target as HTMLElement;
        const boundingRect = entry.boundingClientRect;
        if (boundingRect.width === 0 || boundingRect.height === 0) continue;
        if (!isValidGrabbableElement(targetElement)) continue;
        const computedPosition = getComputedStyle(targetElement).position;
        if (computedPosition === "fixed") continue;
        if (
          (computedPosition === "absolute" || computedPosition === "sticky") &&
          targetElement.childElementCount === 0 &&
          (targetElement.textContent?.trim().length ?? 0) === 0
        ) continue;

        accumulatedElements.push({
          element: targetElement,
        });

        accumulatedRects.push({
          left: boundingRect.left + scrollX,
          top: boundingRect.top + scrollY,
          right: boundingRect.right + scrollX,
          bottom: boundingRect.bottom + scrollY,
        });
      }

      if (accumulatedElements.length === 0) return;

      const tree = new HilbertRTree(accumulatedElements.length);
      for (const rect of accumulatedRects) {
        tree.add(rect.left, rect.top, rect.right, rect.bottom);
      }
      tree.finish();

      currentIndex = { tree, elements: [...accumulatedElements] };
    },
    { rootMargin: `${ELEMENT_AT_POINT_INDEX_ROOT_MARGIN_PX}px` },
  );

  pendingObserver = observer;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) =>
        SKIP_TAGS.has((node as Element).tagName)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    },
  );

  while (walker.nextNode()) {
    const element = walker.currentNode as HTMLElement;
    if (element.offsetWidth === 0 && element.offsetHeight === 0) continue;
    observer.observe(element);
    didObserveAnyElement = true;
  }

  if (!didObserveAnyElement) {
    observer.disconnect();
    pendingObserver = null;
  }
};

const CLIPPING_OVERFLOW_VALUES = new Set(["hidden", "scroll", "auto", "clip"]);
const PAINT_CONTAIN_VALUES = new Set(["paint", "strict", "content"]);

const hasPaintContainment = (containValue: string): boolean => {
  for (const keyword of containValue.split(" ")) {
    if (PAINT_CONTAIN_VALUES.has(keyword)) return true;
  }
  return false;
};

const isVisibleAtPoint = (element: Element, clientX: number, clientY: number): boolean => {
  let ancestor = element.parentElement;
  while (ancestor && ancestor !== document.documentElement) {
    const style = getComputedStyle(ancestor);
    const isPaintContained = hasPaintContainment(style.contain);
    const clipsX = CLIPPING_OVERFLOW_VALUES.has(style.overflowX) || isPaintContained;
    const clipsY = CLIPPING_OVERFLOW_VALUES.has(style.overflowY) || isPaintContained;

    if (clipsX || clipsY) {
      const ancestorRect = ancestor.getBoundingClientRect();
      if (clipsX && (clientX < ancestorRect.left || clientX > ancestorRect.right)) return false;
      if (clipsY && (clientY < ancestorRect.top || clientY > ancestorRect.bottom)) return false;
    }

    ancestor = ancestor.parentElement;
  }
  return true;
};

export const queryElementAtPointIndex = (clientX: number, clientY: number): Element | null => {
  if (!currentIndex) return null;

  const pageX = clientX + window.scrollX;
  const pageY = clientY + window.scrollY;

  const hitIndices = currentIndex.tree.search(pageX, pageY, pageX, pageY);
  if (hitIndices.length === 0) return null;

  const visibleCandidates: Element[] = [];

  for (const hitIndex of hitIndices) {
    const candidate = currentIndex.elements[hitIndex];
    if (!candidate.element.isConnected) continue;
    if (!isVisibleAtPoint(candidate.element, clientX, clientY)) continue;
    visibleCandidates.push(candidate.element);
  }

  if (visibleCandidates.length === 0) return null;
  if (visibleCandidates.length === 1) return visibleCandidates[0];

  visibleCandidates.sort((elementA, elementB) =>
    compareStackingOrder(elementB, elementA),
  );

  return visibleCandidates[0];
};

export const isElementAtPointIndexReady = (): boolean => currentIndex !== null;

export const destroyElementAtPointIndex = (): void => {
  if (pendingObserver) {
    pendingObserver.disconnect();
    pendingObserver = null;
  }
  if (currentIndex) {
    currentIndex.elements.length = 0;
    currentIndex = null;
  }
};
