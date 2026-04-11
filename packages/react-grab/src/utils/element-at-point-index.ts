import { HilbertRTree } from "./hilbert-r-tree.js";
import { ELEMENT_AT_POINT_INDEX_ROOT_MARGIN_PX } from "../constants.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { isDecorativeOverlay } from "./is-decorative-overlay.js";
import { compareStackingOrder } from "./compare-stacking-order.js";

interface PageRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface CachedFixedElement {
  element: Element;
  viewportRect: PageRect;
  zIndex: number;
}

interface ElementAtPointIndexState {
  tree: HilbertRTree | null;
  elements: Element[];
  fixedElements: CachedFixedElement[];
}

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "HEAD",
  "META",
  "LINK",
  "NOSCRIPT",
  "BR",
  "TEMPLATE",
  "SLOT",
]);

let currentIndex: ElementAtPointIndexState | null = null;
let pendingObserver: IntersectionObserver | null = null;

export const buildElementAtPointIndex = (): void => {
  destroyElementAtPointIndex();

  let didObserveAnyElement = false;

  const accumulatedElements: Element[] = [];
  const accumulatedRects: PageRect[] = [];
  const accumulatedFixedElements: CachedFixedElement[] = [];

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
        const computedStyle = getComputedStyle(targetElement);
        if (computedStyle.position === "fixed") {
          accumulatedFixedElements.push({
            element: targetElement,
            viewportRect: {
              left: boundingRect.left,
              top: boundingRect.top,
              right: boundingRect.right,
              bottom: boundingRect.bottom,
            },
            zIndex: parseInt(computedStyle.zIndex, 10) || 0,
          });
          continue;
        }
        if (isDecorativeOverlay(targetElement, computedStyle.position)) continue;

        accumulatedElements.push(targetElement);

        accumulatedRects.push({
          left: boundingRect.left + scrollX,
          top: boundingRect.top + scrollY,
          right: boundingRect.right + scrollX,
          bottom: boundingRect.bottom + scrollY,
        });
      }

      if (accumulatedElements.length === 0 && accumulatedFixedElements.length === 0) return;

      let tree: HilbertRTree | null = null;
      if (accumulatedElements.length > 0) {
        tree = new HilbertRTree(accumulatedElements.length);
        for (const rect of accumulatedRects) {
          tree.add(rect.left, rect.top, rect.right, rect.bottom);
        }
        tree.finish();
      }

      accumulatedFixedElements.sort((entryA, entryB) => entryA.zIndex - entryB.zIndex);

      currentIndex = {
        tree,
        elements: [...accumulatedElements],
        fixedElements: [...accumulatedFixedElements],
      };
    },
    { rootMargin: `${ELEMENT_AT_POINT_INDEX_ROOT_MARGIN_PX}px` },
  );

  pendingObserver = observer;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      SKIP_TAGS.has((node as Element).tagName)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });

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

const CLIPS_X = 1;
const CLIPS_Y = 2;

let clipStateCache = new WeakMap<Element, number>();

const hasPaintContainment = (containValue: string): boolean => {
  for (const keyword of containValue.split(" ")) {
    if (PAINT_CONTAIN_VALUES.has(keyword)) return true;
  }
  return false;
};

const getClipState = (ancestor: Element): number => {
  const cached = clipStateCache.get(ancestor);
  if (cached !== undefined) return cached;

  const style = getComputedStyle(ancestor);
  const isPaintContained = hasPaintContainment(style.contain);
  let state = 0;
  if (CLIPPING_OVERFLOW_VALUES.has(style.overflowX) || isPaintContained) state |= CLIPS_X;
  if (CLIPPING_OVERFLOW_VALUES.has(style.overflowY) || isPaintContained) state |= CLIPS_Y;
  clipStateCache.set(ancestor, state);
  return state;
};

const isVisibleAtPoint = (element: Element, clientX: number, clientY: number): boolean => {
  let ancestor = element.parentElement;
  while (ancestor && ancestor !== document.documentElement) {
    const clipState = getClipState(ancestor);

    if (clipState !== 0) {
      const ancestorRect = ancestor.getBoundingClientRect();
      if (
        (clipState & CLIPS_X) !== 0 &&
        (clientX < ancestorRect.left || clientX > ancestorRect.right)
      )
        return false;
      if (
        (clipState & CLIPS_Y) !== 0 &&
        (clientY < ancestorRect.top || clientY > ancestorRect.bottom)
      )
        return false;
    }

    ancestor = ancestor.parentElement;
  }
  return true;
};

const findTopmostFixedElement = (
  fixedElements: CachedFixedElement[],
  clientX: number,
  clientY: number,
): Element | null => {
  let topmost: CachedFixedElement | null = null;

  for (const entry of fixedElements) {
    if (!entry.element.isConnected) continue;
    const rect = entry.viewportRect;
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      topmost = entry;
    }
  }

  return topmost?.element ?? null;
};

export const queryElementAtPointIndex = (clientX: number, clientY: number): Element | null => {
  if (!currentIndex) return null;

  const pageX = clientX + window.scrollX;
  const pageY = clientY + window.scrollY;

  const fixedHit = findTopmostFixedElement(currentIndex.fixedElements, clientX, clientY);

  const hitIndices = currentIndex.tree?.search(pageX, pageY, pageX, pageY) ?? [];

  const visibleCandidates: Element[] = [];

  for (const hitIndex of hitIndices) {
    const candidate = currentIndex.elements[hitIndex];
    if (!candidate.isConnected) continue;
    if (!isVisibleAtPoint(candidate, clientX, clientY)) continue;
    visibleCandidates.push(candidate);
  }

  if (fixedHit) {
    if (visibleCandidates.length === 0) return fixedHit;
    visibleCandidates.push(fixedHit);
  }

  if (visibleCandidates.length === 0) return null;
  if (visibleCandidates.length === 1) return visibleCandidates[0];

  visibleCandidates.sort((elementA, elementB) => compareStackingOrder(elementB, elementA));

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
    currentIndex.fixedElements.length = 0;
    currentIndex = null;
  }
  clipStateCache = new WeakMap<Element, number>();
};
