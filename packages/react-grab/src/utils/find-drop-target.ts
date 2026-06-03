import { TRANSFORM_INDICATOR_THICKNESS_PX } from "../constants.js";
import type { DropTarget } from "../types.js";
import { resumePointerEventsFreeze, suspendPointerEventsFreeze } from "./pointer-events-freeze.js";

// While frozen the page has `pointer-events: none`, so hit-testing must briefly
// lift it (it is restored synchronously before returning).
const elementsUnderPoint = (clientX: number, clientY: number): Element[] => {
  suspendPointerEventsFreeze();
  try {
    return document.elementsFromPoint(clientX, clientY);
  } finally {
    resumePointerEventsFreeze();
  }
};

// Walks the elements under the cursor (top-most first) and returns the first
// one the dragged element can be reinserted next to: a connected, page-owned
// sibling-level node that is neither the dragged element, its descendant, nor
// its ancestor. The chosen placement (before/after) follows the parent's main
// axis so the insertion indicator reads naturally in rows and columns.
export const findDropTarget = (
  clientX: number,
  clientY: number,
  draggedElement: Element,
): DropTarget | null => {
  const candidates = elementsUnderPoint(clientX, clientY);
  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) continue;
    if (candidate === draggedElement) continue;
    if (draggedElement.contains(candidate) || candidate.contains(draggedElement)) continue;
    if (candidate === document.body || candidate === document.documentElement) continue;
    if (candidate.closest("[data-react-grab]")) continue;
    const parent = candidate.parentElement;
    if (!parent) continue;

    const rect = candidate.getBoundingClientRect();
    const parentStyle = getComputedStyle(parent);
    const isRow =
      parentStyle.display.includes("flex") && parentStyle.flexDirection.startsWith("row");

    const half = TRANSFORM_INDICATOR_THICKNESS_PX / 2;
    if (isRow) {
      const placeBefore = clientX < rect.left + rect.width / 2;
      const lineX = placeBefore ? rect.left : rect.right;
      return {
        reference: candidate,
        placement: placeBefore ? "before" : "after",
        indicator: {
          left: lineX - half,
          top: rect.top,
          width: TRANSFORM_INDICATOR_THICKNESS_PX,
          height: rect.height,
        },
      };
    }

    const placeBefore = clientY < rect.top + rect.height / 2;
    const lineY = placeBefore ? rect.top : rect.bottom;
    return {
      reference: candidate,
      placement: placeBefore ? "before" : "after",
      indicator: {
        left: rect.left,
        top: lineY - half,
        width: rect.width,
        height: TRANSFORM_INDICATOR_THICKNESS_PX,
      },
    };
  }
  return null;
};
