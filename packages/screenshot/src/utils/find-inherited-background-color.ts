import { TRANSPARENT_BACKGROUND_COLOR } from "../constants";
import { getRenderedParentElement } from "./get-rendered-parent-element";

export const findInheritedBackgroundColor = (element: Element): string => {
  const defaultView = element.ownerDocument.defaultView;
  if (!defaultView) return "";
  let ancestorElement = getRenderedParentElement(element);
  while (ancestorElement) {
    const backgroundColor = defaultView.getComputedStyle(ancestorElement).backgroundColor;
    if (
      backgroundColor &&
      backgroundColor !== TRANSPARENT_BACKGROUND_COLOR &&
      backgroundColor !== "transparent"
    ) {
      return backgroundColor;
    }
    ancestorElement = getRenderedParentElement(ancestorElement);
  }
  return "";
};
