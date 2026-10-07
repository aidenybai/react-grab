import { getFiberFromHostInstance, type Fiber } from "bippy";
import type { OverlayBounds } from "../types.js";

interface ElementAdapter {
  hostElement: Element;
  supportsDomEditing: boolean;
  getBounds: () => OverlayBounds;
  getFiber: () => Fiber | null;
  getPreview: () => string;
  getSelector: () => string;
  getTagName: () => string;
  isConnected: () => boolean;
}

const elementAdapters = new WeakMap<Element, ElementAdapter>();

export const registerElementAdapter = (element: Element, adapter: ElementAdapter): void => {
  elementAdapters.set(element, adapter);
};

export const getElementAdapter = (element: Element): ElementAdapter | null =>
  elementAdapters.get(element) ?? null;

export const getReactFiberForElement = (element: Element): Fiber | null =>
  getElementAdapter(element)?.getFiber() ?? getFiberFromHostInstance(element);
