import {
  MAX_HIERARCHY_ANCESTORS,
  MAX_HIERARCHY_CHILDREN,
  MAX_HIERARCHY_SCAN_STEPS,
  MAX_HIERARCHY_SIBLINGS,
} from "../constants.js";
import type { ElementPredicate, HierarchyEntry } from "../types.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";

interface ElementStep {
  (element: Element): Element | null;
}

// Builds a flat, pre-order list describing the DOM neighborhood of the
// selected element: its grabbable ancestor spine (the "stack"), the grabbable
// siblings it sits among, and its grabbable direct children nested underneath.
// Each entry carries the indentation depth and whether it is the last among
// its displayed siblings so the dropdown can draw a terminal-style tree.
//
// Siblings are filtered with `isSiblingNavigable` (the stricter predicate that
// ArrowLeft/ArrowRight use) so every sibling row in the tree is also reachable
// by the horizontal arrow keys; ancestors and children use the looser
// `isGrabbable` that matches Up/Down and click selection.
//
// Traversal is bounded by the render caps and, because the predicates force
// layout per candidate, by a hard step cap — so opening the menu on a large
// list/grid never runs a visibility check over every sibling or child even
// when most candidates fail the predicate.
export const buildElementHierarchy = (
  selectedElement: Element,
  isGrabbable: ElementPredicate,
  isSiblingNavigable: ElementPredicate,
): HierarchyEntry[] => {
  const collectGrabbable = (
    start: Element | null,
    nextFrom: ElementStep,
    maxCount: number,
    isMatch: ElementPredicate,
  ): Element[] => {
    const collected: Element[] = [];
    let current = start;
    let stepsTaken = 0;
    while (current && collected.length < maxCount && stepsTaken < MAX_HIERARCHY_SCAN_STEPS) {
      if (isMatch(current)) collected.push(current);
      current = nextFrom(current);
      stepsTaken += 1;
    }
    return collected;
  };

  const ancestors = collectGrabbable(
    getComposedParentElement(selectedElement),
    getComposedParentElement,
    MAX_HIERARCHY_ANCESTORS,
    isGrabbable,
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
    isSiblingNavigable,
  );
  const after = collectGrabbable(
    selectedElement.nextElementSibling,
    (element) => element.nextElementSibling,
    siblingBudget,
    isSiblingNavigable,
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
    isGrabbable,
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
