import type { HostPoint, HostTarget, HostTargetAdapter, HostTargetDescription } from "./targets.js";
import { resolveLiveElement, trackElementAnchor } from "./core/element-anchors.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { generateId } from "./utils/generate-id.js";
import { getComposedParentElement } from "./utils/get-composed-parent-element.js";
import { getTagName } from "./utils/get-tag-name.js";
import { getUnfilteredElementsAtPoint } from "./utils/get-unfiltered-elements-at-point.js";
import { isElementConnected } from "./utils/is-element-connected.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";

export interface WebHostTargetAdapter extends HostTargetAdapter {
  getTarget: (element: Element) => HostTarget;
  getElement: (target: HostTarget) => Element | null;
}

export const createWebHostTargetAdapter = (): WebHostTargetAdapter => {
  const elementByTarget = new WeakMap<HostTarget, Element>();
  const targetByElement = new WeakMap<Element, HostTarget>();
  const ownedTargets = new WeakSet<HostTarget>();

  const getElement = (target: HostTarget): Element | null => elementByTarget.get(target) ?? null;

  const getTarget = (element: Element): HostTarget => {
    const existingTarget = targetByElement.get(element);
    if (existingTarget) return existingTarget;

    let target: HostTarget;
    target = {
      id: generateId("web-target"),
      platform: "web",
      capabilities: {
        resolve: async () => {
          const currentElement = getElement(target);
          if (!currentElement) return null;
          const liveElement = resolveLiveElement(currentElement) ?? currentElement;
          if (!isElementConnected(liveElement)) return null;
          elementByTarget.set(target, liveElement);
          targetByElement.set(liveElement, target);
          trackElementAnchor(liveElement);
          return target;
        },
        measure: async () => {
          const currentElement = getElement(target);
          if (!currentElement || !isElementConnected(currentElement)) return null;
          return createElementBounds(currentElement);
        },
        describe: async (): Promise<HostTargetDescription> => {
          const currentElement = getElement(target);
          if (!currentElement) {
            return { name: "unknown", role: null, label: null, testId: null };
          }
          return {
            name: getTagName(currentElement),
            role: currentElement.getAttribute("role"),
            label: currentElement.getAttribute("aria-label"),
            testId: currentElement.getAttribute("data-testid"),
          };
        },
        getParent: async () => {
          const currentElement = getElement(target);
          if (!currentElement) return null;
          const parentElement = getComposedParentElement(currentElement);
          return parentElement ? getTarget(parentElement) : null;
        },
        getChildren: async () => {
          const currentElement = getElement(target);
          if (!currentElement) return [];
          return Array.from(currentElement.children, getTarget);
        },
      },
    };

    ownedTargets.add(target);
    elementByTarget.set(target, element);
    targetByElement.set(element, target);
    trackElementAnchor(element);
    return target;
  };

  return {
    platform: "web",
    getTargetAtPoint: async (point: HostPoint) => {
      const elements = getUnfilteredElementsAtPoint(point.x, point.y);
      for (const element of elements) {
        if (isValidGrabbableElement(element)) return getTarget(element);
      }
      return null;
    },
    getTarget,
    getElement: (target: HostTarget) => (ownedTargets.has(target) ? getElement(target) : null),
  };
};
