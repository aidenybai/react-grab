import { TRANSPARENT_BACKGROUND_COLOR } from "../constants";
import type {
  BackdropUnderlayClip,
  BakeBackdropFilterUnderlaysInput,
  ElementReadSnapshot,
  LinearTransform,
} from "../types";
import { composeElementLinearTransform } from "../utils/compose-element-linear-transform";
import { computeFilterExtent } from "../utils/compute-filter-extent";
import { invertLinearTransform } from "../utils/invert-linear-transform";
import { isIdentityLinearTransform } from "../utils/is-identity-linear-transform";
import { multiplyLinearTransforms } from "../utils/multiply-linear-transforms";

// The bake only samples pixels inside each pane's rect expanded by its
// filter extent, so the underlay capture can be clipped to the union of those
// regions (intersected with the root box) instead of paying full-page decode,
// raster, and pixel readback.
export const computeBackdropUnderlayClip = (
  backdropFilterElements: Element[],
  paneRects: DOMRect[],
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  rootRect: DOMRect,
): BackdropUnderlayClip => {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  backdropFilterElements.forEach((backdropElement, paneIndex) => {
    const paneRect = paneRects[paneIndex];
    const backdropFilterValue =
      snapshotByElement.get(backdropElement)?.styles["backdrop-filter"] ?? "";
    const marginPx = Math.ceil(computeFilterExtent(backdropFilterValue));
    left = Math.min(left, paneRect.left - rootRect.left - marginPx);
    top = Math.min(top, paneRect.top - rootRect.top - marginPx);
    right = Math.max(right, paneRect.right - rootRect.left + marginPx);
    bottom = Math.max(bottom, paneRect.bottom - rootRect.top + marginPx);
  });
  const clippedLeft = Math.max(0, Math.floor(left));
  const clippedTop = Math.max(0, Math.floor(top));
  const clippedRight = Math.min(Math.ceil(rootRect.width), Math.ceil(right));
  const clippedBottom = Math.min(Math.ceil(rootRect.height), Math.ceil(bottom));
  return {
    x: clippedLeft,
    y: clippedTop,
    width: Math.max(1, clippedRight - clippedLeft),
    height: Math.max(1, clippedBottom - clippedTop),
  };
};

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

const IDENTITY_LINEAR_TRANSFORM: LinearTransform = { a: 1, b: 0, c: 0, d: 1 };

// The baked underlay is painted in the element's untransformed layout box and
// then re-transformed with the clone, so the device-space transform of the
// element (its own transform composed with every ancestor's up to the capture
// root) must be undone when mapping the sampled backdrop into the box. An
// affine map sends the box center to the center of the transformed
// parallelogram, which is also the center of its AABB, so mapping about the
// two centers needs only the linear part.
const composeChainLinearTransform = (
  element: Element,
  rootElement: Element,
  snapshotByElement: Map<Element, ElementReadSnapshot>,
): LinearTransform => {
  let composed = IDENTITY_LINEAR_TRANSFORM;
  let currentElement: Element | null = element;
  while (currentElement) {
    const snapshot = snapshotByElement.get(currentElement);
    if (snapshot) {
      composed = multiplyLinearTransforms(
        composeElementLinearTransform({
          transform: snapshot.styles["transform"],
          rotate: snapshot.styles["rotate"],
          scale: snapshot.styles["scale"],
        }),
        composed,
      );
    }
    if (currentElement === rootElement) break;
    currentElement = currentElement.parentElement;
  }
  return composed;
};

const renderFilteredBackdropRegion = (
  input: BakeBackdropFilterUnderlaysInput,
  regionLeftPx: number,
  regionTopPx: number,
  regionWidthPx: number,
  regionHeightPx: number,
  marginPx: number,
  backdropFilterValue: string,
): HTMLCanvasElement | null => {
  const {
    underlayCanvas,
    ownerDocument,
    pixelRatio,
    backgroundColor,
    underlayOffsetLeftPx,
    underlayOffsetTopPx,
  } = input;
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
    (regionLeftPx - underlayOffsetLeftPx - marginPx) * pixelRatio,
    (regionTopPx - underlayOffsetTopPx - marginPx) * pixelRatio,
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
  return filteredCanvas;
};

const mapFilteredRegionIntoLayoutBox = (
  input: BakeBackdropFilterUnderlaysInput,
  filteredCanvas: HTMLCanvasElement,
  regionWidthPx: number,
  regionHeightPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
  inverseLinear: LinearTransform,
): HTMLCanvasElement | null => {
  const { ownerDocument, pixelRatio } = input;
  const boxCanvas = ownerDocument.createElement("canvas");
  boxCanvas.width = Math.max(1, Math.round(boxWidthPx * pixelRatio));
  boxCanvas.height = Math.max(1, Math.round(boxHeightPx * pixelRatio));
  const boxContext = boxCanvas.getContext("2d");
  if (!boxContext) return null;
  boxContext.scale(pixelRatio, pixelRatio);
  boxContext.translate(boxWidthPx / 2, boxHeightPx / 2);
  boxContext.transform(inverseLinear.a, inverseLinear.b, inverseLinear.c, inverseLinear.d, 0, 0);
  boxContext.drawImage(
    filteredCanvas,
    -regionWidthPx / 2,
    -regionHeightPx / 2,
    regionWidthPx,
    regionHeightPx,
  );
  return boxCanvas;
};

// Later panes in paint order sample a backdrop that already contains earlier
// panes rendered with their effect, so each pane's filtered result plus its own
// background color is composited back onto the shared underlay before the next
// pane is baked. Children, borders, and corner rounding of the pane are not
// re-painted here - an approximation that only shows where panes overlap.
const compositeBakedPaneOntoUnderlay = (
  input: BakeBackdropFilterUnderlaysInput,
  bakedBoxCanvas: HTMLCanvasElement,
  regionCenterXPx: number,
  regionCenterYPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
  chainLinear: LinearTransform,
  paneBackgroundColor: string | undefined,
): void => {
  const underlayContext = input.underlayCanvas.getContext("2d");
  if (!underlayContext) return;
  underlayContext.save();
  underlayContext.setTransform(input.pixelRatio, 0, 0, input.pixelRatio, 0, 0);
  underlayContext.translate(
    regionCenterXPx - input.underlayOffsetLeftPx,
    regionCenterYPx - input.underlayOffsetTopPx,
  );
  underlayContext.transform(chainLinear.a, chainLinear.b, chainLinear.c, chainLinear.d, 0, 0);
  underlayContext.translate(-boxWidthPx / 2, -boxHeightPx / 2);
  underlayContext.drawImage(bakedBoxCanvas, 0, 0, boxWidthPx, boxHeightPx);
  if (
    paneBackgroundColor &&
    paneBackgroundColor !== TRANSPARENT_BACKGROUND_COLOR &&
    paneBackgroundColor !== "transparent"
  ) {
    underlayContext.fillStyle = paneBackgroundColor;
    underlayContext.fillRect(0, 0, boxWidthPx, boxHeightPx);
  }
  underlayContext.restore();
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
    const chainLinear = composeChainLinearTransform(
      backdropElement,
      input.rootElement,
      input.snapshotByElement,
    );
    const filteredCanvas = renderFilteredBackdropRegion(
      input,
      elementRect.left - rootRect.left,
      elementRect.top - rootRect.top,
      regionWidthPx,
      regionHeightPx,
      Math.ceil(computeFilterExtent(backdropFilterValue)),
      backdropFilterValue,
    );
    if (!filteredCanvas) continue;
    let bakedBoxCanvas = filteredCanvas;
    let boxWidthPx = regionWidthPx;
    let boxHeightPx = regionHeightPx;
    if (!isIdentityLinearTransform(chainLinear)) {
      const inverseLinear = invertLinearTransform(chainLinear);
      if (!inverseLinear) continue;
      const layoutBoxWidthPx =
        backdropElement instanceof HTMLElement ? backdropElement.offsetWidth : 0;
      const layoutBoxHeightPx =
        backdropElement instanceof HTMLElement ? backdropElement.offsetHeight : 0;
      if (layoutBoxWidthPx <= 0 || layoutBoxHeightPx <= 0) continue;
      const mappedCanvas = mapFilteredRegionIntoLayoutBox(
        input,
        filteredCanvas,
        regionWidthPx,
        regionHeightPx,
        layoutBoxWidthPx,
        layoutBoxHeightPx,
        inverseLinear,
      );
      if (!mappedCanvas) continue;
      bakedBoxCanvas = mappedCanvas;
      boxWidthPx = layoutBoxWidthPx;
      boxHeightPx = layoutBoxHeightPx;
    }
    compositeBakedPaneOntoUnderlay(
      input,
      bakedBoxCanvas,
      elementRect.left - rootRect.left + elementRect.width / 2,
      elementRect.top - rootRect.top + elementRect.height / 2,
      boxWidthPx,
      boxHeightPx,
      chainLinear,
      snapshot?.styles["background-color"],
    );
    try {
      bakedPngByElement.set(backdropElement, bakedBoxCanvas.toDataURL());
    } catch {
      continue;
    }
  }
  return bakedPngByElement;
};
