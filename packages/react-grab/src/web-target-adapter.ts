import type { HostPoint, HostTarget, HostTargetAdapter, HostTargetDescription } from "./targets.js";
import { resolveLiveElement, trackElementAnchor } from "./core/element-anchors.js";
import { getElementAtPoint } from "./primitives.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { generateId } from "./utils/generate-id.js";
import { getComposedParentElement } from "./utils/get-composed-parent-element.js";
import { getTagName } from "./utils/get-tag-name.js";
import { isElementConnected } from "./utils/is-element-connected.js";

export interface WebHostTargetAdapter extends HostTargetAdapter {
  getTarget: (element: Element) => HostTarget;
  getElement: (target: HostTarget) => Element | null;
}

export const createWebHostTargetAdapter = (): WebHostTargetAdapter => {
  const elementByTarget = new WeakMap<HostTarget, Element>();
  const targetByElement = new WeakMap<Element, HostTarget>();
  const ownedTargets = new WeakSet<HostTarget>();

  const getElement = (target: HostTarget): Element | null => elementByTarget.get(target) ?? null;

  const resolveElement = (target: HostTarget): Element | null => {
    const currentElement = getElement(target);
    if (!currentElement) return null;
    const liveElement = resolveLiveElement(currentElement) ?? currentElement;
    if (!isElementConnected(liveElement)) return null;
    elementByTarget.set(target, liveElement);
    targetByElement.set(liveElement, target);
    trackElementAnchor(liveElement);
    return liveElement;
  };

  const getTarget = (element: Element): HostTarget => {
    const existingTarget = targetByElement.get(element);
    if (existingTarget) return existingTarget;

    let target: HostTarget;
    target = {
      id: generateId("web-target"),
      platform: "web",
      capabilities: {
        resolve: async () => (resolveElement(target) ? target : null),
        measure: async () => {
          const currentElement = resolveElement(target);
          if (!currentElement) return null;
          return createElementBounds(currentElement);
        },
        describe: async (): Promise<HostTargetDescription> => {
          const currentElement = resolveElement(target);
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
          const currentElement = resolveElement(target);
          if (!currentElement) return null;
          const parentElement = getComposedParentElement(currentElement);
          return parentElement ? getTarget(parentElement) : null;
        },
        getChildren: async () => {
          const currentElement = resolveElement(target);
          if (!currentElement) return [];
          return [
            ...Array.from(currentElement.children, getTarget),
            ...Array.from(currentElement.shadowRoot?.children ?? [], getTarget),
          ];
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
      const element = getElementAtPoint(point.x, point.y);
      return element ? getTarget(element) : null;
    },
    getTarget,
    getElement: (target: HostTarget) => (ownedTargets.has(target) ? getElement(target) : null),
  };
};
