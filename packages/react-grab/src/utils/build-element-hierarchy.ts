import {
  MAX_HIERARCHY_ANCESTORS,
  MAX_HIERARCHY_CHILDREN,
  MAX_HIERARCHY_SIBLINGS,
} from "../constants.js";
import type { HierarchyEntry } from "../types.js";

interface GrabbablePredicate {
  (element: Element): boolean;
}

const windowAroundSelected = (
  elements: Element[],
  selectedIndex: number,
  maxCount: number,
): Element[] => {
  if (elements.length <= maxCount) return elements;
  const half = Math.floor(maxCount / 2);
  let start = Math.max(0, selectedIndex - half);
  if (start + maxCount > elements.length) {
    start = elements.length - maxCount;
  }
  return elements.slice(start, start + maxCount);
};

// Builds a flat, pre-order list describing the DOM neighborhood of the
// selected element: its grabbable ancestor spine (the "stack"), the grabbable
// siblings it sits among, and its grabbable direct children nested underneath.
// Each entry carries the indentation depth and whether it is the last among
// its displayed siblings so the dropdown can draw a terminal-style tree.
export const buildElementHierarchy = (
  selectedElement: Element,
  isGrabbable: GrabbablePredicate,
): HierarchyEntry[] => {
  const ancestors: Element[] = [];
  let ancestor = selectedElement.parentElement;
  while (ancestor && ancestors.length < MAX_HIERARCHY_ANCESTORS) {
    if (isGrabbable(ancestor)) ancestors.push(ancestor);
    ancestor = ancestor.parentElement;
  }
  ancestors.reverse();

  const entries: HierarchyEntry[] = [];
  ancestors.forEach((ancestorElement, ancestorIndex) => {
    entries.push({ element: ancestorElement, depth: ancestorIndex, isLast: true });
  });

  const selectedDepth = ancestors.length;

  const parentElement = selectedElement.parentElement;
  const siblingPool = parentElement
    ? Array.from(parentElement.children).filter(
        (child) => child === selectedElement || isGrabbable(child),
      )
    : [selectedElement];
  const selectedSiblingIndex = Math.max(0, siblingPool.indexOf(selectedElement));
  const siblings = windowAroundSelected(siblingPool, selectedSiblingIndex, MAX_HIERARCHY_SIBLINGS);

  const children = Array.from(selectedElement.children)
    .filter(isGrabbable)
    .slice(0, MAX_HIERARCHY_CHILDREN);

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
