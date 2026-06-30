import { describe, expect, it } from "vite-plus/test";
import type {
  ColorEditableProperty,
  ComparativeIntent,
  EnumEditableProperty,
  NumericEditableProperty,
} from "../src/types.js";
import { parseComparativeIntent } from "../src/utils/comparative-intent.js";
import { resolveComparativeTargets } from "../src/utils/resolve-comparative-target.js";

const numeric = (
  key: string,
  value: number,
  unit: string,
  cssProperties: string[] = [key],
): NumericEditableProperty => ({
  kind: "numeric",
  key,
  label: key.replace(/-/g, " "),
  cssProperties,
  min: 0,
  max: 1000,
  value,
  original: value,
  unit,
  tailwindAliases: [],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
});

const fontWeight = (): EnumEditableProperty => ({
  kind: "enum",
  key: "font-weight",
  label: "font weight",
  cssProperties: ["font-weight"],
  value: "400",
  original: "400",
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

const color: ColorEditableProperty = {
  kind: "color",
  key: "color",
  label: "text color",
  cssProperties: ["color"],
  value: "#000000",
  original: "#000000",
  tailwindAliases: ["color"],
  isPrioritized: false,
  isDefault: false,
  isCanonical: true,
};

const properties = [
  numeric("font-size", 16, "px"),
  numeric("width", 200, "px"),
  numeric("padding", 0, "px", ["padding-top", "padding-right", "padding-bottom", "padding-left"]),
  numeric("opacity", 100, "%"),
  numeric("border-radius", 8, "px", [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
  ]),
  fontWeight(),
  color,
];

const resolve = (query: string) => {
  const intent = parseComparativeIntent(query) as ComparativeIntent;
  return resolveComparativeTargets(intent, properties);
};

describe("resolveComparativeTargets", () => {
  it("resolves comparative adjectives to their dimension property", () => {
    expect(resolve("bigger")?.targets.map((target) => target.key)).toEqual(["font-size"]);
    expect(resolve("wider")?.targets.map((target) => target.key)).toEqual(["width"]);
    expect(resolve("bolder")?.targets.map((target) => target.key)).toEqual(["font-weight"]);
  });

  it("resolves more/less subjects through the alias map", () => {
    expect(resolve("more padding")?.targets.map((target) => target.key)).toEqual(["padding"]);
    expect(resolve("less opacity")?.targets.map((target) => target.key)).toEqual(["opacity"]);
  });

  it("fans out to side rows when no aligned aggregate row exists", () => {
    const sideRows = [
      numeric("padding-top", 4, "px", ["padding-top"]),
      numeric("padding-left", 8, "px", ["padding-left"]),
    ];
    const intent = parseComparativeIntent("more padding") as ComparativeIntent;
    const resolution = resolveComparativeTargets(intent, sideRows);
    expect(resolution?.targets.map((target) => target.key)).toEqual([
      "padding-top",
      "padding-left",
    ]);
  });

  it("lets an explicit subject override the adjective's default dimension", () => {
    const resolution = resolve("make the border radius bigger");
    expect(resolution?.targets.map((target) => target.key)).toEqual(["border-radius"]);
    expect(resolution?.direction).toBe(1);
  });

  it("does not target color or non-ordinal rows", () => {
    expect(resolve("more color")).toBeNull();
  });

  it("carries direction and magnitude through resolution", () => {
    const resolution = resolve("much smaller");
    expect(resolution?.direction).toBe(-1);
    expect(resolution?.magnitude).toBe(2);
  });

  it("resolves excess and shortage commands", () => {
    const tooMuch = resolve("too much padding");
    expect(tooMuch?.targets.map((target) => target.key)).toEqual(["padding"]);
    expect(tooMuch?.direction).toBe(-1);

    const notEnough = resolve("not enough opacity");
    expect(notEnough?.targets.map((target) => target.key)).toEqual(["opacity"]);
    expect(notEnough?.direction).toBe(1);
  });

  it("resolves extra opacity and spacing adjectives", () => {
    expect(resolve("dimmer")?.targets.map((target) => target.key)).toEqual(["opacity"]);
    expect(resolve("roomier")?.targets.map((target) => target.key)).toEqual(["padding"]);
  });
});
