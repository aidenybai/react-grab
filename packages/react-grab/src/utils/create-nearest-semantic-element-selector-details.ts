import {
  createSemanticElementSelectorDetails,
  type ElementSelectorDetails,
} from "./create-element-selector.js";
import { getElementAdapter } from "../core/element-adapter.js";
import { findSelectorTarget } from "./find-selector-target.js";

export const createNearestSemanticElementSelectorDetails = (
  element: Element,
): ElementSelectorDetails | null => {
  if (getElementAdapter(element)) return createSemanticElementSelectorDetails(element);

  let selectorDetails: ElementSelectorDetails | null = null;
  findSelectorTarget(element, (candidate) => {
    const candidateSelectorDetails = createSemanticElementSelectorDetails(candidate);
    if (!candidateSelectorDetails) return false;
    selectorDetails = candidateSelectorDetails;
    return true;
  });
  return selectorDetails;
};
