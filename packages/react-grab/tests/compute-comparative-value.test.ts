import { describe, expect, it } from "vite-plus/test";
import type { EnumEditableProperty, NumericEditableProperty } from "../src/types.js";
import { computeComparativeValue } from "../src/utils/compute-comparative-value.js";

const numeric = (
  key: string,
  value: number,
  unit: string,
  min = 0,
  max = 1000,
): NumericEditableProperty => ({
  kind: "numeric",
  key,
  label: key,
  cssProperties: [key],
  min,
  max,
  value,
  original: value,
  unit,
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
});

const fontWeight = (value: string): EnumEditableProperty => ({
  kind: "enum",
  key: "font-weight",
  label: "font weight",
  cssProperties: ["font-weight"],
  value,
  original: value,
  options: [
    { value: "100", label: "thin" },
    { value: "400", label: "normal" },
    { value: "700", label: "bold" },
    { value: "900", label: "black" },
  ],
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
});

describe("computeComparativeValue", () => {
  it("nudges a length by the larger of a proportional step and the floor", () => {
    expect(computeComparativeValue(numeric("font-size", 16, "px"), 1, 1)).toBe(20);
    expect(computeComparativeValue(numeric("font-size", 16, "px"), -1, 1)).toBe(12);
    expect(computeComparativeValue(numeric("width", 200, "px"), 1, 2)).toBe(300);
  });

  it("moves a zero-valued property by the floor so it still changes", () => {
    expect(computeComparativeValue(numeric("padding", 0, "px"), 1, 1)).toBe(4);
  });

  it("uses a percent floor for opacity", () => {
    expect(computeComparativeValue(numeric("opacity", 100, "%"), -1, 1)).toBe(75);
  });

  it("clamps to the property bounds", () => {
    expect(computeComparativeValue(numeric("font-size", 96, "px", 8, 96), 1, 1)).toBeNull();
  });

  it("steps ordinal enum options without wrapping", () => {
    expect(computeComparativeValue(fontWeight("400"), 1, 1)).toBe("700");
    expect(computeComparativeValue(fontWeight("400"), 1, 2)).toBe("900");
    expect(computeComparativeValue(fontWeight("400"), -1, 1)).toBe("100");
    expect(computeComparativeValue(fontWeight("900"), 1, 1)).toBeNull();
  });
});
