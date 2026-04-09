import { HilbertRTree } from "../vendor/hilbert-r-tree.js";
import { PREHIT_ROOT_MARGIN_PX } from "../constants.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

interface IndexedElement {
  element: Element;
  area: number;
  treeOrder: number;
}

interface PageRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PrehitIndex {
  tree: HilbertRTree;
  elements: IndexedElement[];
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "HEAD", "META", "LINK",
  "NOSCRIPT", "BR", "TEMPLATE", "SLOT",
]);

let currentIndex: PrehitIndex | null = null;
let pendingObserver: IntersectionObserver | null = null;

export const buildPrehitIndex = (): void => {
  destroyPrehitIndex();

  const treeOrderMap = new Map<Element, number>();
  let treeOrder = 0;
  let didObserveAnyElement = false;

  const accumulatedElements: IndexedElement[] = [];
  const accumulatedRects: PageRect[] = [];

  const observer = new IntersectionObserver(
    (entries) => {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      for (const entry of entries) {
        observer.unobserve(entry.target);

        const boundingRect = entry.boundingClientRect;
        if (boundingRect.width === 0 || boundingRect.height === 0) continue;
        if (!isValidGrabbableElement(entry.target)) continue;

        accumulatedElements.push({
          element: entry.target,
          area: boundingRect.width * boundingRect.height,
          treeOrder: treeOrderMap.get(entry.target) ?? 0,
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

      currentIndex = { tree, elements: accumulatedElements };
    },
    { rootMargin: `${PREHIT_ROOT_MARGIN_PX}px` },
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
    treeOrderMap.set(element, treeOrder++);
    observer.observe(element);
    didObserveAnyElement = true;
  }

  if (!didObserveAnyElement) {
    observer.disconnect();
    pendingObserver = null;
  }
};

const CLIPPING_OVERFLOW_VALUES = new Set(["hidden", "scroll", "auto", "clip"]);

const clipsAtPoint = (style: CSSStyleDeclaration, rect: DOMRect, clientX: number, clientY: number): boolean => {
  const clipsX = CLIPPING_OVERFLOW_VALUES.has(style.overflowX);
  const clipsY = CLIPPING_OVERFLOW_VALUES.has(style.overflowY);
  if (!clipsX && !clipsY) return false;
  if (clipsX && (clientX < rect.left || clientX > rect.right)) return true;
  if (clipsY && (clientY < rect.top || clientY > rect.bottom)) return true;
  return false;
};

const isVisibleAtPoint = (element: Element, clientX: number, clientY: number): boolean => {
  let ancestor = element.parentElement;
  while (ancestor && ancestor !== document.documentElement) {
    const style = getComputedStyle(ancestor);

    if (style.contain.includes("paint")) {
      const ancestorRect = ancestor.getBoundingClientRect();
      if (
        clientX < ancestorRect.left ||
        clientX > ancestorRect.right ||
        clientY < ancestorRect.top ||
        clientY > ancestorRect.bottom
      ) {
        return false;
      }
    } else if (
      CLIPPING_OVERFLOW_VALUES.has(style.overflowX) ||
      CLIPPING_OVERFLOW_VALUES.has(style.overflowY)
    ) {
      const ancestorRect = ancestor.getBoundingClientRect();
      if (clipsAtPoint(style, ancestorRect, clientX, clientY)) return false;
    }

    ancestor = ancestor.parentElement;
  }
  return true;
};

export const queryPrehitIndex = (clientX: number, clientY: number): Element | null => {
  if (!currentIndex) return null;

  const pageX = clientX + window.scrollX;
  const pageY = clientY + window.scrollY;

  const hitIndices = currentIndex.tree.search(pageX, pageY, pageX, pageY);
  if (hitIndices.length === 0) return null;

  let bestElement: IndexedElement | null = null;

  for (const hitIndex of hitIndices) {
    const candidate = currentIndex.elements[hitIndex];
    if (!candidate.element.isConnected) continue;
    if (!isVisibleAtPoint(candidate.element, clientX, clientY)) continue;

    if (!bestElement) {
      bestElement = candidate;
      continue;
    }

    if (candidate.area < bestElement.area) {
      bestElement = candidate;
    } else if (candidate.area === bestElement.area && candidate.treeOrder > bestElement.treeOrder) {
      bestElement = candidate;
    }
  }

  return bestElement?.element ?? null;
};

export const isPrehitIndexReady = (): boolean => currentIndex !== null;

export const destroyPrehitIndex = (): void => {
  if (pendingObserver) {
    pendingObserver.disconnect();
    pendingObserver = null;
  }
  if (currentIndex) {
    currentIndex.elements.length = 0;
    currentIndex = null;
  }
};
