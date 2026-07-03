import {
  CHECKBOX_BORDER_RADIUS_PX,
  INDETERMINATE_DASH_INSET_HEIGHT_RATIO,
  INDETERMINATE_DASH_INSET_WIDTH_RATIO,
  SVG_NAMESPACE_URI,
} from "../constants";

export const buildIndeterminateCheckboxStyle = (
  widthPx: number,
  heightPx: number,
  accentColor: string,
): string => {
  const dashLeft = widthPx * INDETERMINATE_DASH_INSET_WIDTH_RATIO;
  const dashTop = heightPx * INDETERMINATE_DASH_INSET_HEIGHT_RATIO;
  const dashWidth = widthPx - 2 * dashLeft;
  const dashHeight = heightPx - 2 * dashTop;
  const dashRadius = Math.min(CHECKBOX_BORDER_RADIUS_PX, dashHeight / 2);
  const replicaSvg =
    `<svg xmlns='${SVG_NAMESPACE_URI}' width='${widthPx}' height='${heightPx}'>` +
    `<rect width='${widthPx}' height='${heightPx}' rx='${CHECKBOX_BORDER_RADIUS_PX}' fill='${accentColor}'/>` +
    `<rect x='${dashLeft}' y='${dashTop}' width='${dashWidth}' height='${dashHeight}' rx='${dashRadius}' fill='#ffffff'/>` +
    `</svg>`;
  return (
    "appearance:none;-webkit-appearance:none;border:none;background-color:transparent;" +
    `background-image:url("data:image/svg+xml,${encodeURIComponent(replicaSvg)}");` +
    "background-repeat:no-repeat;background-position:center;background-size:100% 100%;"
  );
};
