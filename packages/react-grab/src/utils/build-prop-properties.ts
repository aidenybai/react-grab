import type { EditableProperty, NumericEditableProperty } from "../types.js";
import { collectFiberNumericProps } from "./collect-fiber-numeric-props.js";
import { findPropsFiber } from "./find-props-fiber.js";
import { propNumericBounds } from "./prop-numeric-bounds.js";

const buildPropNumericProperty = (path: string[], value: number): NumericEditableProperty => {
  const bounds = propNumericBounds(path, value);
  const label = path.join(".");
  return {
    kind: "numeric",
    key: `prop:${label}`,
    label,
    source: "prop",
    cssProperties: [],
    propPath: path,
    // Keep the live value reachable even when it sits outside the
    // heuristic range (e.g. a duration of 12 with a 0–10 default).
    min: Math.min(bounds.min, value),
    max: Math.max(bounds.max, value),
    value,
    original: value,
    unit: "",
    step: bounds.step,
    tailwindAliases: [],
    // Prop rows are the headline reason the panel opened on a component, so
    // they sit in the prioritized tier and show before any CSS rows.
    isPrioritized: true,
    isDefault: false,
    isCanonical: true,
  };
};

export const buildPropProperties = (element: Element): EditableProperty[] => {
  const fiber = findPropsFiber(element);
  if (!fiber) return [];
  return collectFiberNumericProps(fiber).map((numericProp) =>
    buildPropNumericProperty(numericProp.path, numericProp.value),
  );
};
