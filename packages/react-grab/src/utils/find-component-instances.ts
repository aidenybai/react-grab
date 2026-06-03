import {
  _fiberRoots,
  getDisplayName,
  getFiberFromHostInstance,
  getNearestHostFiber,
  getType,
  isCompositeFiber,
  traverseFiber,
  type Fiber,
} from "bippy";
import { MAX_COMPONENT_INSTANCE_SELECTION } from "../constants.js";
import { isUsefulComponentName } from "./is-useful-component-name.js";

interface FiberRootLike {
  current: Fiber | null;
}

const resolveComponentType = (fiber: Fiber): unknown => getType(fiber.type) ?? fiber.type;

const findNearestComponentFiber = (element: Element): Fiber | null => {
  let currentElement: Element | null = element;
  while (currentElement) {
    const hostFiber = getFiberFromHostInstance(currentElement);
    if (hostFiber) {
      let candidateFiber: Fiber | null = hostFiber.return;
      while (candidateFiber) {
        if (isCompositeFiber(candidateFiber)) {
          const name = getDisplayName(candidateFiber.type);
          if (name && isUsefulComponentName(name)) return candidateFiber;
        }
        candidateFiber = candidateFiber.return;
      }
    }
    currentElement = currentElement.parentElement;
  }
  return null;
};

const getRootFiber = (fiber: Fiber): Fiber => {
  let currentFiber = fiber;
  while (currentFiber.return) {
    currentFiber = currentFiber.return;
  }
  return currentFiber;
};

const collectRootFibers = (fallbackFiber: Fiber): Fiber[] => {
  const trackedRoots = _fiberRoots as Set<FiberRootLike>;
  const rootFibers: Fiber[] = [];

  if (trackedRoots.size > 0) {
    for (const fiberRoot of trackedRoots) {
      if (fiberRoot.current) rootFibers.push(fiberRoot.current);
    }
  }

  if (rootFibers.length === 0) {
    rootFibers.push(getRootFiber(fallbackFiber));
  }

  return rootFibers;
};

const getNearestHostElement = (fiber: Fiber): Element | null => {
  const hostFiber = getNearestHostFiber(fiber);
  const node = hostFiber?.stateNode;
  return node instanceof Element ? node : null;
};

/**
 * Finds every rendered instance of the component nearest to `element`.
 *
 * Walks up from the clicked DOM node to its nearest meaningfully-named
 * component fiber, then traverses each React root with bippy's
 * `traverseFiber` to collect fibers sharing that component type, mapping
 * each back to its nearest host (DOM) node. The clicked instance is always
 * returned first so callers can anchor their selection there.
 */
export const findComponentInstanceElements = (element: Element): Element[] => {
  const targetFiber = findNearestComponentFiber(element);
  if (!targetFiber) return [];

  const targetType = resolveComponentType(targetFiber);
  const matchedElements: Element[] = [];
  const seenElements = new Set<Element>();

  const targetElement = getNearestHostElement(targetFiber);
  if (targetElement) {
    seenElements.add(targetElement);
    matchedElements.push(targetElement);
  }

  const visitFiber = (fiber: Fiber): boolean => {
    if (matchedElements.length >= MAX_COMPONENT_INSTANCE_SELECTION) return true;
    if (!isCompositeFiber(fiber)) return false;
    if (resolveComponentType(fiber) !== targetType) return false;

    const hostElement = getNearestHostElement(fiber);
    if (hostElement && !seenElements.has(hostElement)) {
      seenElements.add(hostElement);
      matchedElements.push(hostElement);
    }
    return false;
  };

  for (const rootFiber of collectRootFibers(targetFiber)) {
    if (matchedElements.length >= MAX_COMPONENT_INSTANCE_SELECTION) break;
    traverseFiber(rootFiber, visitFiber);
  }

  return matchedElements;
};
