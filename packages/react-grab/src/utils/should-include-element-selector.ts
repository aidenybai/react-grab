import type { ElementSelectorDetails } from "./create-element-selector.js";

export const shouldIncludeElementSelector = (
  shouldAppendSelectorHint: boolean,
  selectorDetails: ElementSelectorDetails,
): boolean => shouldAppendSelectorHint || selectorDetails.isSemantic;
