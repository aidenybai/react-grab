import { MIN_CAPTURE_DIMENSION_PX } from "../constants";
import type { CaptureOutputGeometry, ComputeRootOutputGeometryInput } from "../types";
import { composeElementLinearTransform } from "../utils/compose-element-linear-transform";
import { getRenderedParentElement } from "../utils/get-rendered-parent-element";
import { isHtmlElement } from "../utils/is-html-element";
import { isIdentityLinearTransform } from "../utils/is-identity-linear-transform";
import { multiplyLinearTransforms } from "../utils/multiply-linear-transforms";

const buildUntransformedGeometry = (
  layoutWidthPx: number,
  layoutHeightPx: number,
  bleedPx: number,
): CaptureOutputGeometry => ({
  layoutWidthPx,
  layoutHeightPx,
  outputWidthPx: layoutWidthPx + 2 * bleedPx,
  outputHeightPx: layoutHeightPx + 2 * bleedPx,
  contentOffsetLeftPx: bleedPx,
  contentOffsetTopPx: bleedPx,
  rootLinearTransform: null,
});

// Translation components (translate(), the translate property, matrix e/f) are
// deliberately excluded: they move the painted box on screen without changing
// its shape, and the capture re-anchors the painted AABB at the output origin
// anyway. Perspective (ancestor `perspective`, matrix3d w-row) is not
// reproducible with a flattened 2D matrix and stays out of scope.
export const computeRootOutputGeometry = ({
  rootElement,
  rootStyles,
  defaultView,
  layoutWidthPx,
  layoutHeightPx,
  bleedPx,
}: ComputeRootOutputGeometryInput): CaptureOutputGeometry => {
  if (!isHtmlElement(rootElement)) {
    return buildUntransformedGeometry(layoutWidthPx, layoutHeightPx, bleedPx);
  }
  let composedLinear = composeElementLinearTransform({
    transform: rootStyles["transform"],
    rotate: rootStyles["rotate"],
    scale: rootStyles["scale"],
  });
  let ancestorElement = getRenderedParentElement(rootElement);
  while (ancestorElement) {
    const ancestorStyles = defaultView.getComputedStyle(ancestorElement);
    composedLinear = multiplyLinearTransforms(
      composeElementLinearTransform({
        transform: ancestorStyles.getPropertyValue("transform"),
        rotate: ancestorStyles.getPropertyValue("rotate"),
        scale: ancestorStyles.getPropertyValue("scale"),
      }),
      composedLinear,
    );
    ancestorElement = getRenderedParentElement(ancestorElement);
  }
  if (isIdentityLinearTransform(composedLinear)) {
    return buildUntransformedGeometry(layoutWidthPx, layoutHeightPx, bleedPx);
  }
  const { a, b, c, d } = composedLinear;
  const cornerXs = [
    0,
    a * layoutWidthPx,
    c * layoutHeightPx,
    a * layoutWidthPx + c * layoutHeightPx,
  ];
  const cornerYs = [
    0,
    b * layoutWidthPx,
    d * layoutHeightPx,
    b * layoutWidthPx + d * layoutHeightPx,
  ];
  const minX = Math.floor(Math.min(...cornerXs));
  const minY = Math.floor(Math.min(...cornerYs));
  const maxX = Math.ceil(Math.max(...cornerXs));
  const maxY = Math.ceil(Math.max(...cornerYs));
  return {
    layoutWidthPx,
    layoutHeightPx,
    outputWidthPx: Math.max(MIN_CAPTURE_DIMENSION_PX, maxX - minX) + 2 * bleedPx,
    outputHeightPx: Math.max(MIN_CAPTURE_DIMENSION_PX, maxY - minY) + 2 * bleedPx,
    contentOffsetLeftPx: -minX + bleedPx,
    contentOffsetTopPx: -minY + bleedPx,
    rootLinearTransform: composedLinear,
  };
};
