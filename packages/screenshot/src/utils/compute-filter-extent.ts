import { FILTER_BLUR_EXTENT_SIGMA_FACTOR, SHADOW_BLUR_EXTENT_FACTOR } from "../constants";
import { parsePx } from "./parse-px";
import { parsePxLengths } from "./parse-px-lengths";

export const computeFilterExtent = (filterValue: string | undefined): number => {
  if (!filterValue || filterValue === "none") return 0;
  let extent = 0;
  const functionPattern = /([a-z-]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let functionMatch = functionPattern.exec(filterValue);
  while (functionMatch) {
    const [, functionName, functionArguments] = functionMatch;
    if (functionName === "blur") {
      extent = Math.max(extent, parsePx(functionArguments) * FILTER_BLUR_EXTENT_SIGMA_FACTOR);
    } else if (functionName === "drop-shadow") {
      const [offsetX = 0, offsetY = 0, blur = 0] = parsePxLengths(functionArguments);
      extent = Math.max(
        extent,
        Math.max(Math.abs(offsetX), Math.abs(offsetY)) + blur * SHADOW_BLUR_EXTENT_FACTOR,
      );
    }
    functionMatch = functionPattern.exec(filterValue);
  }
  return extent;
};
