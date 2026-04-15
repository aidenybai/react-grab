const getClampLines = (element: Element): number => {
  const computed = getComputedStyle(element);
  const lineClampValue =
    computed.getPropertyValue("-webkit-line-clamp") || computed.getPropertyValue("line-clamp");
  const parsed = parseInt(lineClampValue || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

import {
  SNAPSHOT_DEFAULT_FONT_SIZE_PX,
  SNAPSHOT_DEFAULT_LINE_HEIGHT_RATIO,
} from "../../constants.js";

const computeLineHeightPx = (computed: CSSStyleDeclaration): number => {
  const lineHeight = (computed.lineHeight || "").trim();
  const fontSize = parseFloat(computed.fontSize) || SNAPSHOT_DEFAULT_FONT_SIZE_PX;
  if (!lineHeight || lineHeight === "normal") return Math.round(fontSize * SNAPSHOT_DEFAULT_LINE_HEIGHT_RATIO);
  if (lineHeight.endsWith("px")) return parseFloat(lineHeight);
  if (/^\d+(\.\d+)?$/.test(lineHeight)) return Math.round(parseFloat(lineHeight) * fontSize);
  if (lineHeight.endsWith("%")) return Math.round((parseFloat(lineHeight) / 100) * fontSize);
  return Math.round(fontSize * SNAPSHOT_DEFAULT_LINE_HEIGHT_RATIO);
};

const computeVerticalPadding = (computed: CSSStyleDeclaration): number =>
  (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);

const isPlainTextContainer = (element: Element): boolean => {
  if (element.childElementCount > 0) return false;
  return Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE);
};

export const stabilizeLineClamp = (rootElement: Element): (() => void) => {
  const undoOperations: Array<() => void> = [];

  const processElement = (element: Element) => {
    const clampLines = getClampLines(element);
    if (clampLines <= 0) return;
    if (!isPlainTextContainer(element)) return;

    const computed = getComputedStyle(element);
    const targetHeight = Math.round(
      computeLineHeightPx(computed) * clampLines + computeVerticalPadding(computed),
    );

    const originalText = element.textContent ?? "";
    if (element.scrollHeight <= targetHeight + 0.5) return;

    let lowBound = 0;
    let highBound = originalText.length;
    let bestCutoff = -1;

    while (lowBound <= highBound) {
      const midpoint = (lowBound + highBound) >> 1;
      element.textContent = originalText.slice(0, midpoint) + "\u2026";
      if (element.scrollHeight <= targetHeight + 0.5) {
        bestCutoff = midpoint;
        lowBound = midpoint + 1;
      } else {
        highBound = midpoint - 1;
      }
    }

    element.textContent = (bestCutoff >= 0 ? originalText.slice(0, bestCutoff) : "") + "\u2026";

    undoOperations.push(() => {
      element.textContent = originalText;
    });
  };

  const walkTree = (element: Element) => {
    processElement(element);
    for (const child of Array.from(element.children)) walkTree(child);
  };

  walkTree(rootElement);

  return () => {
    for (const undo of undoOperations) undo();
  };
};
