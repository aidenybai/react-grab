import { Flatbush } from "../vendor/flatbush.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";

interface IndexedElement {
  element: Element;
  area: number;
  treeOrder: number;
}

interface PrehitIndex {
  tree: Flatbush;
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
  let observedCount = 0;

  const accumulatedElements: IndexedElement[] = [];
  const accumulatedRects: { left: number; top: number; right: number; bottom: number }[] = [];

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

      const tree = new Flatbush(accumulatedElements.length);
      for (const rect of accumulatedRects) {
        tree.add(rect.left, rect.top, rect.right, rect.bottom);
      }
      tree.finish();

      currentIndex = { tree, elements: [...accumulatedElements] };
    },
    { rootMargin: "10000px" },
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
    observedCount++;
  }

  if (observedCount === 0) {
    observer.disconnect();
    pendingObserver = null;
  }
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
