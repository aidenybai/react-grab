import { describe, expect, it } from "vite-plus/test";
import { OPACITY_PERCENT_MAX } from "../src/constants.js";
import {
  isDefaultByBaseline,
  isDefaultByHeuristic,
} from "../src/utils/css-baseline-measurement.js";
import type { ComputedSnapshot } from "../src/utils/css-snapshot.js";
import type {
  ColorEditableProperty,
  EnumEditableOption,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../src/types.js";

const numeric = (
  overrides: Partial<NumericEditableProperty> & { key: string },
): NumericEditableProperty => ({
  kind: "numeric",
  label: overrides.key,
  cssProperties: [overrides.key],
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
  min: 0,
  max: 100,
  value: 0,
  original: 0,
  unit: "px",
  ...overrides,
});

const enumProperty = (
  key: string,
  original: string,
  options: ReadonlyArray<EnumEditableOption>,
): EnumEditableProperty => ({
  kind: "enum",
  key,
  label: key,
  cssProperties: [key],
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
  value: original,
  original,
  options,
});

const color = (key: string): ColorEditableProperty => ({
  kind: "color",
  key,
  label: key,
  cssProperties: [key],
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
  value: "#000000",
  original: "#000000",
});

describe("isDefaultByHeuristic", () => {
  it("never treats colors as default", () => {
    expect(isDefaultByHeuristic(color("color"))).toBe(false);
  });

  it("uses 400 as the default font-weight, and the first option otherwise", () => {
    const fontWeightOptions = [
      { value: "400", label: "normal" },
      { value: "700", label: "bold" },
    ];
    expect(isDefaultByHeuristic(enumProperty("font-weight", "400", fontWeightOptions))).toBe(true);
    expect(isDefaultByHeuristic(enumProperty("font-weight", "700", fontWeightOptions))).toBe(false);

    const alignOptions = [
      { value: "left", label: "left" },
      { value: "center", label: "center" },
    ];
    expect(isDefaultByHeuristic(enumProperty("text-align", "left", alignOptions))).toBe(true);
    expect(isDefaultByHeuristic(enumProperty("text-align", "center", alignOptions))).toBe(false);
  });

  it("treats zero as default for spacing, gap, border-width, radius, letter-spacing, z-index", () => {
    expect(isDefaultByHeuristic(numeric({ key: "padding-top", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "margin-left", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "margin-left", original: 8 }))).toBe(false);
    expect(isDefaultByHeuristic(numeric({ key: "gap", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "border-width", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "border-top-left-radius", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "letter-spacing", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "z-index", original: 0 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "z-index", original: 5 }))).toBe(false);
  });

  it("uses the max-opacity sentinel for opacity", () => {
    expect(isDefaultByHeuristic(numeric({ key: "opacity", original: OPACITY_PERCENT_MAX }))).toBe(
      true,
    );
    expect(isDefaultByHeuristic(numeric({ key: "opacity", original: 50 }))).toBe(false);
  });

  it("never treats positioned (inset) keys as default", () => {
    expect(isDefaultByHeuristic(numeric({ key: "top", original: 0 }))).toBe(false);
  });

  it("treats size and line-height keys as default regardless of value", () => {
    expect(isDefaultByHeuristic(numeric({ key: "width", original: 200 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "max-width", original: 200 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "min-height", original: 200 }))).toBe(true);
    expect(isDefaultByHeuristic(numeric({ key: "line-height", original: 24 }))).toBe(true);
  });

  it("falls through to false for unrecognized keys", () => {
    expect(isDefaultByHeuristic(numeric({ key: "font-size", original: 16 }))).toBe(false);
  });
});

describe("isDefaultByBaseline", () => {
  const empty: ComputedSnapshot = {};

  it("never treats colors as default", () => {
    expect(isDefaultByBaseline(color("background-color"), empty, empty)).toBe(false);
  });

  it("defers to the heuristic for layout-dependent keys (display/width/height)", () => {
    // width is layout-dependent, so it routes to the heuristic, which treats
    // size keys as default — independent of the snapshots passed.
    const widthProperty = numeric({ key: "width", cssProperties: ["width"], original: 320 });
    expect(isDefaultByBaseline(widthProperty, empty, empty)).toBe(true);
  });

  it("compares against the baseline snapshot for non-layout keys", () => {
    const padding = numeric({ key: "padding-top", cssProperties: ["padding-top"] });
    expect(isDefaultByBaseline(padding, { "padding-top": "0px" }, { "padding-top": "0px" })).toBe(
      true,
    );
    expect(isDefaultByBaseline(padding, { "padding-top": "8px" }, { "padding-top": "0px" })).toBe(
      false,
    );
  });

  it("is not default when a compared key is missing from either snapshot", () => {
    const padding = numeric({ key: "padding-top", cssProperties: ["padding-top"] });
    expect(isDefaultByBaseline(padding, {}, { "padding-top": "0px" })).toBe(false);
  });
});
