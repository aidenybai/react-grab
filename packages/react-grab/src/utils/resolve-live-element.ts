import {
  getFiberFromHostInstance,
  getLatestFiber,
  getNearestHostFibers,
  isHostFiber,
  type Fiber,
} from "bippy";
import { indexInParent } from "./index-in-parent.js";

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
  // Child-index chain from the anchor down to the tracked element; empty when
  // the element is itself the anchor.
  domPath: number[];
  targetTagName: string;
}

// Recovery metadata for each tracked element, captured while it was still
// mounted (React nulls the fiber pointers on unmount, so this must be recorded
// before the swap).
const anchorByElement = new WeakMap<Element, ElementAnchor>();

// Host fibers rendered as children of the anchor's parent fiber — the level
// where the swapped-out anchor lived. When the parent is a component fiber,
// getNearestHostFibers already returns its host children. When the parent is
// itself a host fiber (the common case of one host element nested inside
// another within the same component, e.g. a keyed `<li>` inside a `<ul>`),
// getNearestHostFibers returns that parent host itself rather than descending,
// so we step one level down and collect the host fibers under each child. Using
// the parent host directly would compare its tag against the child's and never
// match, dropping the selection.
const candidateHostFibers = (parentFiber: Fiber): Fiber[] => {
  const latest = getLatestFiber(parentFiber);
  if (!isHostFiber(latest)) return getNearestHostFibers(latest);

  const hostFibers: Fiber[] = [];
  let child: Fiber | null = latest.child;
  while (child) {
    if (isHostFiber(child)) hostFibers.push(child);
    else hostFibers.push(...getNearestHostFibers(child));
    child = child.sibling;
  }
  return hostFibers;
};

const liveHostElementFromFiber = (parentFiber: Fiber, tagName: string): Element | null => {
  for (const hostFiber of candidateHostFibers(parentFiber)) {
    const node = hostFiber.stateNode;
    // The tag match keeps recovery from latching onto an unrelated host when the
    // original element type is gone. Same-tag siblings under a shared ancestor
    // can't be told apart and resolve to the first match, which still leaves the
    // selection on a valid node instead of dropping it.
    if (node instanceof Element && node.isConnected && node.tagName === tagName) {
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
  return { anchorElement, anchorParentFiber, domPath, targetTagName: element.tagName };
};

// Records how to recover an element after a DOM swap. Cheap and idempotent:
// skips disconnected elements and anything already tracked.
export const trackElementFiber = (element: Element): void => {
  if (!element.isConnected) return;
  if (anchorByElement.has(element)) return;
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

  const liveAnchor = anchor.anchorElement.isConnected
    ? anchor.anchorElement
    : liveHostElementFromFiber(anchor.anchorParentFiber, anchor.anchorElement.tagName);
  if (!liveAnchor) return null;

  const recovered = followDomPath(liveAnchor, anchor.domPath);
  if (recovered && recovered.isConnected && recovered.tagName === anchor.targetTagName) {
    return recovered;
  }
  return null;
};
