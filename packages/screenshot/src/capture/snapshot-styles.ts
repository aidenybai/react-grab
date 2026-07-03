import {
  SKIPPED_CLONE_TAGS,
  SVG_NAMESPACE_URI,
  SVG_TEMPLATE_CONTAINER_TAGS,
  UNRECURSED_CLONE_TAGS,
} from "../constants";
import type { ElementReadSnapshot } from "../types";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { isZeroScaleOverlay } from "../utils/is-zero-scale-overlay";
import { snapshotComputedStyle } from "../utils/snapshot-computed-style";
import {
  preflightPseudoRules,
  snapshotFirstLetterStyles,
  snapshotMarkerStyles,
  snapshotPseudoStyles,
} from "./pseudo-elements";

const isSvgTemplateContainer = (element: Element): boolean =>
  element.namespaceURI === SVG_NAMESPACE_URI && SVG_TEMPLATE_CONTAINER_TAGS.has(element.localName);

export const snapshotComposedTree = (
  rootElement: Element,
  defaultView: Window & typeof globalThis,
  filterNode: ((element: Element) => boolean) | undefined,
): Map<Element, ElementReadSnapshot> => {
  const snapshotByElement = new Map<Element, ElementReadSnapshot>();
  const pseudoPreflight = preflightPseudoRules(rootElement.ownerDocument);

  const visit = (
    element: Element,
    parentElement: Element | null,
    isInShadowTree: boolean,
  ): void => {
    if (SKIPPED_CLONE_TAGS.has(element.localName)) return;
    if (isSvgTemplateContainer(element)) return;
    if (filterNode && !filterNode(element)) return;
    const styles = snapshotComputedStyle(defaultView.getComputedStyle(element));
    const canNeverPaint = styles["display"] === "none" || isZeroScaleOverlay(styles);
    if (canNeverPaint && parentElement !== null) return;
    const capturePseudos = pseudoPreflight.definesBeforeAfter || isInShadowTree;
    const captureMarker =
      (pseudoPreflight.definesMarker || isInShadowTree) &&
      (styles["display"] ?? "").includes("list-item");
    snapshotByElement.set(element, {
      styles,
      beforeStyles: capturePseudos ? snapshotPseudoStyles(element, "::before", defaultView) : null,
      afterStyles: capturePseudos ? snapshotPseudoStyles(element, "::after", defaultView) : null,
      firstLetterStyles: pseudoPreflight.definesFirstLetter
        ? snapshotFirstLetterStyles(element, defaultView)
        : null,
      markerStyles: captureMarker ? snapshotMarkerStyles(element, defaultView) : null,
      parentElement,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    });
    if (UNRECURSED_CLONE_TAGS.has(element.localName)) return;
    const childIsInShadowTree = isInShadowTree || Boolean(element.shadowRoot);
    for (const childNode of getComposedChildNodes(element)) {
      if (isElementNode(childNode)) visit(childNode, element, childIsInShadowTree);
    }
  };

  visit(rootElement, null, false);
  return snapshotByElement;
};
