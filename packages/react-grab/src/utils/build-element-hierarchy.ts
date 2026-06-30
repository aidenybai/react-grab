import {
  MAX_HIERARCHY_ANCESTORS,
  MAX_HIERARCHY_CHILDREN,
  MAX_HIERARCHY_SIBLINGS,
} from "../constants.js";
import type { HierarchyEntry } from "../types.js";

interface GrabbablePredicate {
  (element: Element): boolean;
}

interface ElementStep {
  (element: Element): Element | null;
}

// Builds a flat, pre-order list describing the DOM neighborhood of the
// selected element: its grabbable ancestor spine (the "stack"), the grabbable
// siblings it sits among, and its grabbable direct children nested underneath.
// Each entry carries the indentation depth and whether it is the last among
// its displayed siblings so the dropdown can draw a terminal-style tree.
//
// Traversal is bounded by the render caps (it stops once enough grabbable
// neighbors are found) so opening the menu on a large list/grid does not run a
// visibility check over every sibling or child.
export const buildElementHierarchy = (
  selectedElement: Element,
  isGrabbable: GrabbablePredicate,
): HierarchyEntry[] => {
  const collectGrabbable = (start: Element | null, step: ElementStep, max: number): Element[] => {
    const collected: Element[] = [];
    let current = start;
    while (current && collected.length < max) {
      if (isGrabbable(current)) collected.push(current);
      current = step(current);
    }
    return collected;
  };

  const ancestors = collectGrabbable(
    selectedElement.parentElement,
    (element) => element.parentElement,
    MAX_HIERARCHY_ANCESTORS,
  );
  ancestors.reverse();

  const entries: HierarchyEntry[] = ancestors.map((ancestorElement, ancestorIndex) => ({
    element: ancestorElement,
    depth: ancestorIndex,
    isLast: true,
  }));

  const selectedDepth = ancestors.length;

  // Collect up to a full sibling budget on each side, then keep a window
  // centered on the selection, spending any unused budget on the longer side.
  const siblingBudget = MAX_HIERARCHY_SIBLINGS - 1;
  const before = collectGrabbable(
    selectedElement.previousElementSibling,
    (element) => element.previousElementSibling,
    siblingBudget,
  );
  const after = collectGrabbable(
    selectedElement.nextElementSibling,
    (element) => element.nextElementSibling,
    siblingBudget,
  );
  const beforeShown = Math.min(
    before.length,
    Math.max(Math.floor(siblingBudget / 2), siblingBudget - after.length),
  );
  const afterShown = Math.min(after.length, siblingBudget - beforeShown);
  const siblings = [
    ...before.slice(0, beforeShown).reverse(),
    selectedElement,
    ...after.slice(0, afterShown),
  ];

  const children = collectGrabbable(
    selectedElement.firstElementChild,
    (element) => element.nextElementSibling,
    MAX_HIERARCHY_CHILDREN,
  );

  const lastSiblingIndex = siblings.length - 1;
  const lastChildIndex = children.length - 1;

  siblings.forEach((siblingElement, siblingIndex) => {
    entries.push({
      element: siblingElement,
      depth: selectedDepth,
      isLast: siblingIndex === lastSiblingIndex,
    });
    if (siblingElement === selectedElement) {
      children.forEach((childElement, childIndex) => {
        entries.push({
          element: childElement,
          depth: selectedDepth + 1,
          isLast: childIndex === lastChildIndex,
        });
      });
    }
  });

  return entries;
};
