import {
  getFiberFromHostInstance,
  getLatestFiber,
  getNearestHostFibers,
  isHostFiber,
  type Fiber,
} from "bippy";

// Parent fiber of each tracked element, captured while it was still mounted.
// React mutates a fiber's `return`/`alternate` to null when it unmounts, so the
// only link from a swapped-out node back to the live tree is an ancestor fiber
// recorded before the unmount. The parent survives the child's remount.
const ancestorFiberByElement = new WeakMap<Element, Fiber>();

const liveHostElementFromFiber = (fiber: Fiber, tagName: string): Element | null => {
  const latest = getLatestFiber(fiber);
  const hostFibers = isHostFiber(latest) ? [latest] : getNearestHostFibers(latest);
  let fallback: Element | null = null;
  for (const hostFiber of hostFibers) {
    const node = hostFiber.stateNode;
    if (!(node instanceof Element) || !node.isConnected) continue;
    // Prefer a recovered node whose tag matches the original so we latch onto
    // the swapped element rather than an unrelated sibling host.
    if (node.tagName === tagName) return node;
    fallback ??= node;
  }
  return fallback;
};

// Records the parent fiber of a still-connected element so its replacement can
// be recovered later. Cheap and idempotent: skips disconnected elements and
// anything already tracked.
export const trackElementFiber = (element: Element): void => {
  if (!element.isConnected) return;
  if (ancestorFiberByElement.has(element)) return;
  const parentFiber = getFiberFromHostInstance(element)?.return;
  if (parentFiber) ancestorFiberByElement.set(element, parentFiber);
};

// When React swaps the DOM node backing a selected element — a conditional
// remount (`cond ? <a/> : <button/>`), a route/view transition, or an
// animation library reparenting nodes — the originally captured Element
// detaches and the selection box plus copied context break. The fiber is the
// stable identity that survives the swap, so we re-resolve the current host
// node from it and latch the selection onto the new DOM node.
//
// First we try the element's own fiber in case React kept it and only swapped
// its host instance. Otherwise we fall back to the ancestor fiber captured by
// trackElementFiber while the element was alive and read its current host
// descendant.
export const resolveLiveElement = (element: Element): Element | null => {
  if (element.isConnected) return element;

  const tagName = element.tagName;

  const ownFiber = getFiberFromHostInstance(element);
  if (ownFiber) {
    const liveFromOwn = liveHostElementFromFiber(ownFiber, tagName);
    if (liveFromOwn) return liveFromOwn;
  }

  const ancestorFiber = ancestorFiberByElement.get(element);
  if (ancestorFiber) {
    const liveFromAncestor = liveHostElementFromFiber(ancestorFiber, tagName);
    if (liveFromAncestor) return liveFromAncestor;
  }

  return null;
};
