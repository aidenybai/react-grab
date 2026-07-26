import {
  createSemanticElementSelectorDetails,
  type ElementSelectorDetails,
} from "./create-element-selector.js";
import { findSelectorTarget } from "./find-selector-target.js";

export const createNearestSemanticElementSelectorDetails = (
  element: Element,
): ElementSelectorDetails | null => {
  let selectorDetails: ElementSelectorDetails | null = null;
  findSelectorTarget(element, (candidate) => {
    const candidateSelectorDetails = createSemanticElementSelectorDetails(candidate);
    if (!candidateSelectorDetails) return false;
    selectorDetails = candidateSelectorDetails;
    return true;
  });
  return selectorDetails;
};
