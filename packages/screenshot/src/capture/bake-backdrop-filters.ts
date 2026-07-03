import type { BakeBackdropFilterUnderlaysInput, ElementReadSnapshot } from "../types";
import { computeFilterExtent } from "../utils/compute-filter-extent";

export const collectBackdropFilterElements = (
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  rootElement: Element,
): Element[] => {
  const backdropFilterElements: Element[] = [];
  for (const [element, snapshot] of snapshotByElement) {
    if (element === rootElement) continue;
    const backdropFilterValue = snapshot.styles["backdrop-filter"];
    if (backdropFilterValue && backdropFilterValue !== "none") {
      backdropFilterElements.push(element);
    }
  }
  return backdropFilterElements;
};

const renderFilteredBackdropRegion = (
  input: BakeBackdropFilterUnderlaysInput,
  regionLeftPx: number,
  regionTopPx: number,
  regionWidthPx: number,
  regionHeightPx: number,
  marginPx: number,
  backdropFilterValue: string,
): string | null => {
  const { underlayCanvas, ownerDocument, pixelRatio, backgroundColor } = input;
  const expandedWidthPx = regionWidthPx + 2 * marginPx;
  const expandedHeightPx = regionHeightPx + 2 * marginPx;
  const expandedCanvas = ownerDocument.createElement("canvas");
  expandedCanvas.width = Math.max(1, Math.round(expandedWidthPx * pixelRatio));
  expandedCanvas.height = Math.max(1, Math.round(expandedHeightPx * pixelRatio));
  const expandedContext = expandedCanvas.getContext("2d");
  if (!expandedContext) return null;
  if (backgroundColor) {
    expandedContext.fillStyle = backgroundColor;
    expandedContext.fillRect(0, 0, expandedCanvas.width, expandedCanvas.height);
  }
  expandedContext.drawImage(
    underlayCanvas,
    (regionLeftPx - marginPx) * pixelRatio,
    (regionTopPx - marginPx) * pixelRatio,
    expandedCanvas.width,
    expandedCanvas.height,
    0,
    0,
    expandedCanvas.width,
    expandedCanvas.height,
  );
  const filteredCanvas = ownerDocument.createElement("canvas");
  filteredCanvas.width = Math.max(1, Math.round(regionWidthPx * pixelRatio));
  filteredCanvas.height = Math.max(1, Math.round(regionHeightPx * pixelRatio));
  const filteredContext = filteredCanvas.getContext("2d");
  if (!filteredContext) return null;
  filteredContext.scale(pixelRatio, pixelRatio);
  filteredContext.filter = backdropFilterValue;
  filteredContext.drawImage(
    expandedCanvas,
    -marginPx,
    -marginPx,
    expandedWidthPx,
    expandedHeightPx,
  );
  try {
    return filteredCanvas.toDataURL();
  } catch {
    return null;
  }
};

export const bakeBackdropFilterUnderlays = (
  input: BakeBackdropFilterUnderlaysInput,
): Map<Element, string> => {
  const bakedPngByElement = new Map<Element, string>();
  const rootRect = input.rootElement.getBoundingClientRect();
  for (const backdropElement of input.backdropFilterElements) {
    const snapshot = input.snapshotByElement.get(backdropElement);
    const backdropFilterValue = snapshot?.styles["backdrop-filter"];
    if (!backdropFilterValue || backdropFilterValue === "none") continue;
    const elementRect = backdropElement.getBoundingClientRect();
    const regionWidthPx = Math.round(elementRect.width);
    const regionHeightPx = Math.round(elementRect.height);
    if (regionWidthPx <= 0 || regionHeightPx <= 0) continue;
    const bakedPngDataUrl = renderFilteredBackdropRegion(
      input,
      elementRect.left - rootRect.left,
      elementRect.top - rootRect.top,
      regionWidthPx,
      regionHeightPx,
      Math.ceil(computeFilterExtent(backdropFilterValue)),
      backdropFilterValue,
    );
    if (bakedPngDataUrl) bakedPngByElement.set(backdropElement, bakedPngDataUrl);
  }
  return bakedPngByElement;
};
