import {
  VIEWPORT_SAMPLE_COLUMNS,
  VIEWPORT_SAMPLE_ROWS,
  VIEWPORT_SAMPLE_EDGE_INSET_PX,
  VIEWPORT_MAX_ELEMENTS,
} from "../constants.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { isRootElement } from "./is-root-element.js";

export const collectViewportElements = (): Element[] => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const uniqueElements = new Set<Element>();

  for (let columnIndex = 0; columnIndex < VIEWPORT_SAMPLE_COLUMNS; columnIndex += 1) {
    const sampleX =
      VIEWPORT_SAMPLE_EDGE_INSET_PX +
      ((columnIndex + 0.5) / VIEWPORT_SAMPLE_COLUMNS) *
        (viewportWidth - VIEWPORT_SAMPLE_EDGE_INSET_PX * 2);

    for (let rowIndex = 0; rowIndex < VIEWPORT_SAMPLE_ROWS; rowIndex += 1) {
      if (uniqueElements.size >= VIEWPORT_MAX_ELEMENTS) break;

      const sampleY =
        VIEWPORT_SAMPLE_EDGE_INSET_PX +
        ((rowIndex + 0.5) / VIEWPORT_SAMPLE_ROWS) *
          (viewportHeight - VIEWPORT_SAMPLE_EDGE_INSET_PX * 2);

      const elementsAtPoint = document.elementsFromPoint(sampleX, sampleY);
      for (const element of elementsAtPoint) {
        if (uniqueElements.size >= VIEWPORT_MAX_ELEMENTS) break;
        if (isRootElement(element)) continue;
        if (!isValidGrabbableElement(element)) continue;
        uniqueElements.add(element);
      }
    }
  }

  return Array.from(uniqueElements);
};
