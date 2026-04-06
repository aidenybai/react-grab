import type { InspectPropertyRow } from "../types.js";
import { formatPropValue } from "./format-prop-value.js";
import { findNearestCompositeFiber } from "./find-nearest-composite-fiber.js";
import { INSPECT_MAX_REACT_PROPS } from "../constants.js";

const HIDDEN_PROP_KEYS = new Set(["children", "key", "ref", "__self", "__source"]);

export const getReactProps = (element: Element): InspectPropertyRow[] => {
  const compositeFiber = findNearestCompositeFiber(element);
  if (!compositeFiber?.memoizedProps) return [];

  const fiberProps = compositeFiber.memoizedProps;
  if (typeof fiberProps !== "object") return [];

  return Object.entries(fiberProps)
    .filter(([propKey]) => !HIDDEN_PROP_KEYS.has(propKey) && !propKey.startsWith("__"))
    .slice(0, INSPECT_MAX_REACT_PROPS)
    .map(([propKey, propValue]) => ({ label: propKey, value: formatPropValue(propValue) }));
};
