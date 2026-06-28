import {
  getFiberFromHostInstance,
  getLatestFiber,
  getNearestHostFibers,
  isHostFiber,
  type Fiber,
} from "bippy";
import { MAX_FIBER_RELINK_DEPTH } from "../constants.js";

const connectedHostElement = (fiber: Fiber): Element | null => {
  const node = fiber.stateNode;
  return node instanceof Element && node.isConnected ? node : null;
};

const liveHostElementsFromFiber = (fiber: Fiber): Element[] => {
  const latest = getLatestFiber(fiber);
  const hostFibers = isHostFiber(latest) ? [latest] : getNearestHostFibers(latest);
  const elements: Element[] = [];
  for (const hostFiber of hostFibers) {
    const element = connectedHostElement(hostFiber);
    if (element) elements.push(element);
  }
  return elements;
};

// When React swaps the DOM node backing a selected element — a conditional
// remount (`cond ? <a/> : <button/>`), a route/view transition, or an
// animation library reparenting nodes — the originally captured Element
// detaches and the selection box plus copied context break. The fiber is the
// stable identity that survives the swap, so we re-resolve the current host
// node from it and latch the selection onto the new DOM node.
//
// A detached node still carries its `__reactFiber$` back-reference, so we can
// reach the captured fiber and walk its (now stale) `return` chain. For each
// ancestor we map back to the live, double-buffered fiber via getLatestFiber
// and read its connected host node. We start at the captured fiber and climb
// only a bounded number of ancestors so recovery never jumps to the root, and
// prefer a recovered node whose tag matches the original to avoid latching
// onto a sibling.
export const resolveLiveElement = (element: Element): Element | null => {
  if (element.isConnected) return element;

  let fiber: Fiber | null = getFiberFromHostInstance(element);
  if (!fiber) return null;

  const tagName = element.tagName;
  let depth = 0;
  while (fiber && depth <= MAX_FIBER_RELINK_DEPTH) {
    const liveElements = liveHostElementsFromFiber(fiber);
    if (liveElements.length > 0) {
      return liveElements.find((live) => live.tagName === tagName) ?? liveElements[0];
    }
    fiber = fiber.return;
    depth += 1;
  }

  return null;
};
