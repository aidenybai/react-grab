import { ABSOLUTE_CONTAINING_BLOCK_POSITIONS } from "../constants";
import type { CloneContext, ElementReadSnapshot, StyleDeclarationMap } from "../types";
import { parsePx } from "../utils/parse-px";

const isNonDefault = (propertyValue: string | undefined): boolean =>
  propertyValue !== undefined && propertyValue !== "none";

const establishesCloneContainingBlock = (styles: StyleDeclarationMap): boolean =>
  ABSOLUTE_CONTAINING_BLOCK_POSITIONS.has(styles["position"] ?? "") ||
  isNonDefault(styles["transform"]) ||
  isNonDefault(styles["filter"]) ||
  isNonDefault(styles["backdrop-filter"]) ||
  isNonDefault(styles["perspective"]);

const hasScrollWrapperInClone = (snapshot: ElementReadSnapshot): boolean =>
  (snapshot.scrollLeft !== 0 || snapshot.scrollTop !== 0) &&
  ((snapshot.styles["overflow-x"] !== undefined && snapshot.styles["overflow-x"] !== "visible") ||
    (snapshot.styles["overflow-y"] !== undefined && snapshot.styles["overflow-y"] !== "visible"));

// Serialized clones have no browser viewport: position:fixed would resolve
// against the foreignObject box instead of where the element painted live.
// Like sticky descendants, fixed descendants are pinned as absolute boxes at
// their live viewport-relative offsets translated into the coordinates of the
// containing block they will get inside the clone. Fixed boxes are already
// out of flow, so no flow placeholder is needed.
export const freezeFixedDescendants = (rootElement: Element, context: CloneContext): void => {
  const rootSnapshot = context.snapshotByElement.get(rootElement);
  if (!rootSnapshot) return;
  for (const [element, snapshot] of context.snapshotByElement) {
    if (element === rootElement || snapshot.styles["position"] !== "fixed") continue;
    const fixedClone = context.cloneByElement.get(element);
    if (!fixedClone || !fixedClone.parentNode) continue;
    const fixedRect = element.getBoundingClientRect();
    let containingElement: Element | null = null;
    let containingSnapshot: ElementReadSnapshot | null = null;
    let ancestorElement = snapshot.parentElement;
    while (ancestorElement && ancestorElement !== rootElement) {
      const ancestorSnapshot = context.snapshotByElement.get(ancestorElement);
      if (!ancestorSnapshot) break;
      if (
        hasScrollWrapperInClone(ancestorSnapshot) ||
        establishesCloneContainingBlock(ancestorSnapshot.styles)
      ) {
        containingElement = ancestorElement;
        containingSnapshot = ancestorSnapshot;
        break;
      }
      ancestorElement = ancestorSnapshot.parentElement;
    }
    let frozenLeft: number;
    let frozenTop: number;
    if (containingElement && containingSnapshot) {
      const containingRect = containingElement.getBoundingClientRect();
      const containingStyles = containingSnapshot.styles;
      frozenLeft =
        fixedRect.left - containingRect.left - parsePx(containingStyles["border-left-width"]);
      frozenTop =
        fixedRect.top - containingRect.top - parsePx(containingStyles["border-top-width"]);
      if (hasScrollWrapperInClone(containingSnapshot)) {
        // Live padding reads: a memo-hit snapshot can hold the seed's padding
        // when the container's own padding rides inline on the clone.
        const containingComputedStyle =
          containingElement.ownerDocument.defaultView?.getComputedStyle(containingElement);
        frozenLeft +=
          containingSnapshot.scrollLeft -
          parsePx(containingComputedStyle?.getPropertyValue("padding-left"));
        frozenTop +=
          containingSnapshot.scrollTop -
          parsePx(containingComputedStyle?.getPropertyValue("padding-top"));
      }
    } else {
      const rootRect = rootElement.getBoundingClientRect();
      const rootIsPositionedInClone = (rootSnapshot.styles["position"] ?? "static") !== "static";
      frozenLeft =
        fixedRect.left -
        rootRect.left -
        (rootIsPositionedInClone ? parsePx(rootSnapshot.styles["border-left-width"]) : 0);
      frozenTop =
        fixedRect.top -
        rootRect.top -
        (rootIsPositionedInClone ? parsePx(rootSnapshot.styles["border-top-width"]) : 0);
    }
    fixedClone.setAttribute(
      "style",
      `${fixedClone.getAttribute("style") ?? ""}position:absolute;top:${frozenTop}px;left:${frozenLeft}px;right:auto;bottom:auto;margin:0;`,
    );
  }
};
