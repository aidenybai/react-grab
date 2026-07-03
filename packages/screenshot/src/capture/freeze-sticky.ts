import type { CloneContext, ElementReadSnapshot } from "../types";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { parsePx } from "../utils/parse-px";

// The scroll wrapper's transform makes it the containing block for absolute
// descendants, so pinning sticky clones at their live painted offsets (in the
// scroller's content coordinates) nets out the wrapper translation exactly.
export const freezeStickyDescendants = (scrollContainer: Element, context: CloneContext): void => {
  const containerSnapshot = context.snapshotByElement.get(scrollContainer);
  if (!containerSnapshot) return;
  const containerRect = scrollContainer.getBoundingClientRect();
  const containerStyles = containerSnapshot.styles;
  const contentOriginLeft =
    containerRect.left +
    parsePx(containerStyles["border-left-width"]) +
    parsePx(containerStyles["padding-left"]);
  const contentOriginTop =
    containerRect.top +
    parsePx(containerStyles["border-top-width"]) +
    parsePx(containerStyles["padding-top"]);

  const pinStickyClone = (stickyElement: Element, snapshot: ElementReadSnapshot): void => {
    const stickyClone = context.cloneByElement.get(stickyElement);
    if (!stickyClone || !stickyClone.parentNode) return;
    const stickyRect = stickyElement.getBoundingClientRect();
    const placeholder = context.ownerDocument.createElement("div");
    placeholder.setAttribute(
      "style",
      `visibility:hidden;box-sizing:border-box;display:${snapshot.styles["display"] ?? "block"};` +
        `width:${stickyRect.width}px;height:${stickyRect.height}px;` +
        `margin:${snapshot.styles["margin-top"] ?? "0px"} ${snapshot.styles["margin-right"] ?? "0px"} ` +
        `${snapshot.styles["margin-bottom"] ?? "0px"} ${snapshot.styles["margin-left"] ?? "0px"};`,
    );
    stickyClone.parentNode.insertBefore(placeholder, stickyClone);
    const frozenLeft = stickyRect.left - contentOriginLeft + containerSnapshot.scrollLeft;
    const frozenTop = stickyRect.top - contentOriginTop + containerSnapshot.scrollTop;
    stickyClone.setAttribute(
      "style",
      `position:absolute;top:${frozenTop}px;left:${frozenLeft}px;right:auto;bottom:auto;margin:0;`,
    );
  };

  const visit = (element: Element): void => {
    for (const childNode of getComposedChildNodes(element)) {
      if (!isElementNode(childNode)) continue;
      const childSnapshot = context.snapshotByElement.get(childNode);
      if (!childSnapshot) continue;
      if (childSnapshot.scrollLeft !== 0 || childSnapshot.scrollTop !== 0) continue;
      if (childSnapshot.styles["position"] === "sticky") {
        pinStickyClone(childNode, childSnapshot);
        continue;
      }
      visit(childNode);
    }
  };

  visit(scrollContainer);
};
