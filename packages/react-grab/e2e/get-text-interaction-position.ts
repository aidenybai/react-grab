import type { Locator } from "@playwright/test";

export const getTextInteractionPosition = async (element: Locator) =>
  element.evaluate((targetElement) => {
    if (targetElement.firstElementChild) return undefined;

    const targetBounds = targetElement.getBoundingClientRect();
    const textNodeWalker = document.createTreeWalker(targetElement, NodeFilter.SHOW_TEXT);
    let textNode = textNodeWalker.nextNode();
    while (textNode) {
      if (textNode.textContent?.trim()) {
        const textRange = document.createRange();
        textRange.selectNodeContents(textNode);
        for (const textBounds of textRange.getClientRects()) {
          const clippedLeft = Math.max(textBounds.left, targetBounds.left);
          const clippedTop = Math.max(textBounds.top, targetBounds.top);
          const clippedRight = Math.min(textBounds.right, targetBounds.right);
          const clippedBottom = Math.min(textBounds.bottom, targetBounds.bottom);
          if (clippedRight > clippedLeft && clippedBottom > clippedTop) {
            return {
              x: clippedLeft - targetBounds.left + (clippedRight - clippedLeft) / 2,
              y: clippedTop - targetBounds.top + (clippedBottom - clippedTop) / 2,
            };
          }
        }
      }
      textNode = textNodeWalker.nextNode();
    }
    return undefined;
  });
