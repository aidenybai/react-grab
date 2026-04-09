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

export const buildPrehitIndex = (): void => {
  destroyPrehitIndex();

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const elements: IndexedElement[] = [];
  const rects: { left: number; top: number; right: number; bottom: number }[] = [];
  let treeOrder = 0;

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
    if (!isValidGrabbableElement(element)) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    elements.push({
      element,
      area: rect.width * rect.height,
      treeOrder: treeOrder++,
    });

    rects.push({
      left: rect.left + scrollX,
      top: rect.top + scrollY,
      right: rect.right + scrollX,
      bottom: rect.bottom + scrollY,
    });
  }

  if (elements.length === 0) return;

  const tree = new Flatbush(elements.length);
  for (const indexedRect of rects) {
    tree.add(indexedRect.left, indexedRect.top, indexedRect.right, indexedRect.bottom);
  }
  tree.finish();

  currentIndex = { tree, elements };
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
  currentIndex = null;
};
