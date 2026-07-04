import { MARGIN_ESCAPE_GEOMETRY_TOLERANCE_PX } from "../constants";
import type { ElementReadSnapshot, StyleDeclarationMap } from "../types";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { parsePx } from "../utils/parse-px";

const BLOCK_LEVEL_DISPLAY_VALUES = new Set(["block", "list-item", "flex", "grid", "table"]);

const isInFlow = (styles: StyleDeclarationMap): boolean => {
  const position = styles["position"];
  return (
    position !== "absolute" &&
    position !== "fixed" &&
    (styles["float"] === undefined || styles["float"] === "none")
  );
};

const canBottomMarginEscape = (styles: StyleDeclarationMap): boolean => {
  const display = styles["display"];
  if (display !== "block" && display !== "list-item") return false;
  if (!isInFlow(styles)) return false;
  if (styles["overflow-x"] !== "visible" || styles["overflow-y"] !== "visible") return false;
  return parsePx(styles["padding-bottom"]) === 0 && parsePx(styles["border-bottom-width"]) === 0;
};

const isCollapsibleBlockChild = (styles: StyleDeclarationMap): boolean =>
  isInFlow(styles) &&
  styles["display"] !== undefined &&
  BLOCK_LEVEL_DISPLAY_VALUES.has(styles["display"]);

// Freezing computed heights onto clones gives every box a definite height,
// which stops last-child bottom margins from collapsing through their parent
// (CSS 2.1 §8.3.1 requires an auto height), so the escaped margin is re-emitted
// on the parent whose live border-box bottom coincides with the child's.
export const applyEscapedBottomMarginTransfers = (
  rootElement: Element,
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  emittedStylesByElement: Map<Element, StyleDeclarationMap>,
): Set<Element> => {
  const escapedMarginByElement = new Map<Element, number>();
  const transferredElements = new Set<Element>();

  const findLastInFlowElementChild = (element: Element): Element | null => {
    const childNodes = getComposedChildNodes(element);
    for (let childIndex = childNodes.length - 1; childIndex >= 0; childIndex--) {
      const childNode = childNodes[childIndex];
      if (childNode.nodeType === Node.COMMENT_NODE) continue;
      if (childNode.nodeType === Node.TEXT_NODE) {
        if (/\S/.test(childNode.textContent ?? "")) return null;
        continue;
      }
      if (!isElementNode(childNode)) continue;
      const childSnapshot = snapshotByElement.get(childNode);
      if (!childSnapshot) continue;
      if (childSnapshot.styles["display"] === "none") continue;
      if (!isInFlow(childSnapshot.styles)) continue;
      return childNode;
    }
    return null;
  };

  const computeEscapedBottomMargin = (element: Element): number => {
    const memoizedMargin = escapedMarginByElement.get(element);
    if (memoizedMargin !== undefined) return memoizedMargin;
    escapedMarginByElement.set(element, 0);
    const snapshot = snapshotByElement.get(element);
    if (!snapshot || !canBottomMarginEscape(snapshot.styles)) return 0;
    if (snapshot.scrollTop !== 0 || snapshot.scrollLeft !== 0) return 0;
    const lastChild = findLastInFlowElementChild(element);
    if (!lastChild) return 0;
    const lastChildSnapshot = snapshotByElement.get(lastChild);
    if (!lastChildSnapshot || !isCollapsibleBlockChild(lastChildSnapshot.styles)) return 0;
    const childChainMargin = Math.max(
      parsePx(lastChildSnapshot.styles["margin-bottom"]),
      computeEscapedBottomMargin(lastChild),
    );
    if (childChainMargin <= 0) return 0;
    const parentBottom = element.getBoundingClientRect().bottom;
    const childBottom = lastChild.getBoundingClientRect().bottom;
    if (Math.abs(parentBottom - childBottom) > MARGIN_ESCAPE_GEOMETRY_TOLERANCE_PX) return 0;
    escapedMarginByElement.set(element, childChainMargin);
    return childChainMargin;
  };

  for (const [element, snapshot] of snapshotByElement) {
    if (element === rootElement) continue;
    const escapedMargin = computeEscapedBottomMargin(element);
    if (escapedMargin <= 0) continue;
    if (escapedMargin <= parsePx(snapshot.styles["margin-bottom"])) continue;
    const emittedStyles = emittedStylesByElement.get(element);
    if (emittedStyles) {
      // Copy-on-write: the emitted map may be shared across memo-identical
      // elements, and the escaped margin belongs to this element only.
      emittedStylesByElement.set(element, {
        ...emittedStyles,
        "margin-bottom": `${escapedMargin}px`,
      });
      transferredElements.add(element);
    }
  }
  return transferredElements;
};
