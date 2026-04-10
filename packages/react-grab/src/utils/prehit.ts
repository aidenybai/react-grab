import { HilbertRTree } from "./hilbert-r-tree.js";
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

        const targetElement = entry.target as HTMLElement;
        const boundingRect = entry.boundingClientRect;
        if (boundingRect.width === 0 || boundingRect.height === 0) continue;
        if (!isValidGrabbableElement(targetElement)) continue;

        let elementWidth = targetElement.clientWidth;
        let elementHeight = targetElement.clientHeight;
        if (elementWidth === 0 || elementHeight === 0) {
          elementWidth = boundingRect.width;
          elementHeight = boundingRect.height;
          if (elementWidth === 0 || elementHeight === 0) continue;
        }

        accumulatedElements.push({
          element: targetElement,
          area: elementWidth * elementHeight,
          treeOrder: treeOrderMap.get(targetElement) ?? 0,
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
