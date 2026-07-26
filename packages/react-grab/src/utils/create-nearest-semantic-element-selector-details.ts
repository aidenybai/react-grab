import {
  createSemanticElementSelectorDetails,
  type ElementSelectorDetails,
} from "./create-element-selector.js";
import { findSelectorTarget } from "./find-selector-target.js";

export const createNearestSemanticElementSelectorDetails = (
  element: Element,
): ElementSelectorDetails | null => {
  const elementSelectorDetails = createSemanticElementSelectorDetails(element);
  if (elementSelectorDetails) return elementSelectorDetails;

  let selectorDetails: ElementSelectorDetails | null = null;
  findSelectorTarget(element, (candidate) => {
    if (candidate === element) return false;
    const candidateSelectorDetails = createSemanticElementSelectorDetails(candidate);
    if (!candidateSelectorDetails) return false;
    selectorDetails = candidateSelectorDetails;
    return true;
  });
  return selectorDetails;
};
