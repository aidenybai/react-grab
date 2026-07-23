import { getFiberFromHostInstance, type Fiber } from "bippy";
import type { OverlayBounds } from "../types.js";

export interface ElementAdapter {
  physicalElement: Element;
  supportsDomEditing: boolean;
  getBounds: () => OverlayBounds;
  getFiber: () => Fiber | null;
  getPreview: () => string;
  getSelector: () => string;
  getTagName: () => string;
  isConnected: () => boolean;
}

export interface ElementPointResolver {
  (candidateElement: Element, clientX: number, clientY: number): Element | null;
}

const adaptersByElement = new WeakMap<Element, ElementAdapter>();
const pointResolvers = new Set<ElementPointResolver>();

export const registerElementAdapter = (element: Element, adapter: ElementAdapter): void => {
  adaptersByElement.set(element, adapter);
};

export const getElementAdapter = (element: Element): ElementAdapter | null =>
  adaptersByElement.get(element) ?? null;

export const registerElementPointResolver = (resolver: ElementPointResolver): void => {
  pointResolvers.add(resolver);
};

export const resolveElementAtPoint = (
  candidateElement: Element,
  clientX: number,
  clientY: number,
): Element | null => {
  for (const resolver of pointResolvers) {
    const resolvedElement = resolver(candidateElement, clientX, clientY);
    if (resolvedElement) return resolvedElement;
  }
  return null;
};

export const getReactFiberForElement = (element: Element): Fiber | null =>
  getElementAdapter(element)?.getFiber() ?? getFiberFromHostInstance(element);
