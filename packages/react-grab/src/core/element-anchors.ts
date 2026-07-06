import {
  getFiberFromHostInstance,
  getLatestFiber,
  getNearestHostFibers,
  isHostFiber,
  type Fiber,
} from "bippy";
import { indexInParent } from "../utils/index-in-parent.js";

interface ElementAnchor {
  // Nearest ancestor (or the element itself) that React manages via a fiber.
  // Content rendered through `dangerouslySetInnerHTML` — e.g. syntax-highlighted
  // code — has no fiber of its own, so we anchor to the nearest fibered host and
  // re-find the element by the DOM path below it after a re-render.
  anchorElement: Element;
  // Parent fiber of the anchor, used to recover the anchor when React remounts
  // it: a fiber's own `return`/`alternate` are nulled on unmount, so the link
  // back to the live tree has to come from an ancestor that survives.
  anchorParentFiber: Fiber;
  // Position of the anchor among its parent's element children, used to re-find
  // the anchor's replacement when the parent fiber is itself a host fiber (a
  // keyed host element nested directly under another host element).
  anchorIndexInParent: number;
  // Child-index chain from the anchor down to the tracked element; empty when
  // the element is itself the anchor.
  domPath: number[];
  targetTagName: string;
}

// Recovery metadata for each tracked element, captured while it was still
// mounted (React nulls the fiber pointers on unmount, so this must be recorded
// before the swap).
const anchorByElement = new WeakMap<Element, ElementAnchor>();

const resolveLiveAnchor = (anchor: ElementAnchor): Element | null => {
  if (anchor.anchorElement.isConnected) return anchor.anchorElement;

  const anchorTagName = anchor.anchorElement.tagName;
  const latestParentFiber = getLatestFiber(anchor.anchorParentFiber);

  // A host parent fiber keeps its DOM node across a keyed swap of its child, so
  // the replacement sits at the anchor's recorded child index — an exact lookup
  // that same-tag siblings can't confuse.
  if (isHostFiber(latestParentFiber)) {
    const parentNode = latestParentFiber.stateNode;
    if (!(parentNode instanceof Element) || !parentNode.isConnected) return null;
    const candidate = parentNode.children[anchor.anchorIndexInParent];
    return candidate && candidate.tagName === anchorTagName ? candidate : null;
  }

  for (const hostFiber of getNearestHostFibers(latestParentFiber)) {
    const node = hostFiber.stateNode;
    // The tag match keeps recovery from latching onto an unrelated host when the
    // original element type is gone. Same-tag siblings under a shared composite
    // ancestor can't be told apart and resolve to the first match, which still
    // leaves the selection on a valid node instead of dropping it.
    if (node instanceof Element && node.isConnected && node.tagName === anchorTagName) {
      return node;
    }
  }
  return null;
};

const followDomPath = (root: Element, domPath: number[]): Element | null => {
  let node: Element = root;
  for (const childIndex of domPath) {
    const child = node.children[childIndex];
    if (!child) return null;
    node = child;
  }
  return node;
};

// Walks up to the nearest fiber-managed ancestor, recording the DOM path taken
// so a non-fibered element (innerHTML content) can be re-found beneath it.
const findAnchor = (element: Element): ElementAnchor | null => {
  const domPath: number[] = [];
  let anchorElement: Element | null = element;
  let anchorFiber = getFiberFromHostInstance(anchorElement);
  while (anchorElement && !anchorFiber) {
    domPath.unshift(indexInParent(anchorElement));
    anchorElement = anchorElement.parentElement;
    anchorFiber = getFiberFromHostInstance(anchorElement);
  }
  const anchorParentFiber = anchorFiber?.return;
  if (!anchorElement || !anchorParentFiber) return null;
  return {
    anchorElement,
    anchorParentFiber,
    anchorIndexInParent: indexInParent(anchorElement),
    domPath,
    targetTagName: element.tagName,
  };
};

const isAnchorFresh = (anchor: ElementAnchor, element: Element): boolean =>
  anchor.anchorElement.isConnected &&
  anchor.anchorIndexInParent === indexInParent(anchor.anchorElement) &&
  followDomPath(anchor.anchorElement, anchor.domPath) === element;

// Records how to recover an element after a DOM swap. Keeps the anchor fresh
// across sibling reorders: an existing record is reused only while its DOM
// positions still hold, so revalidation stays cheap (no fiber lookups) on the
// common no-change tick.
export const trackElementAnchor = (element: Element): void => {
  if (!element.isConnected) return;
  const existingAnchor = anchorByElement.get(element);
  if (existingAnchor && isAnchorFresh(existingAnchor, element)) return;
  const anchor = findAnchor(element);
  if (anchor) anchorByElement.set(element, anchor);
};

// When React swaps the DOM node backing a selected element — a conditional
// remount, a route/view transition, an animation library reparenting nodes, or
// a `dangerouslySetInnerHTML` subtree (syntax-highlighted code) being replaced —
// the originally captured Element detaches and the selection box, copied
// context, and post-copy label break. We recover by resolving the nearest
// surviving fibered ancestor and re-walking the recorded DOM path to the
// element's replacement.
export const resolveLiveElement = (element: Element): Element | null => {
  if (element.isConnected) return element;

  const anchor = anchorByElement.get(element);
  if (!anchor) return null;

  const liveAnchor = resolveLiveAnchor(anchor);
  if (!liveAnchor) return null;

  const recovered = followDomPath(liveAnchor, anchor.domPath);
  if (recovered && recovered.isConnected && recovered.tagName === anchor.targetTagName) {
    return recovered;
  }
  return null;
};
