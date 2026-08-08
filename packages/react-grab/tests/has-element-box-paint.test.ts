import { describe, expect, it } from "vite-plus/test";
import { hasElementBoxPaint } from "../src/utils/has-element-box-paint.js";

const createComputedStyle = (styleOverrides: object = {}) =>
  Object.assign(
    {
      backgroundClip: "border-box",
      backgroundColor: "transparent",
      backgroundImage: "none",
      borderBottomStyle: "none",
      borderBottomWidth: "0px",
      borderLeftStyle: "none",
      borderLeftWidth: "0px",
      borderRightStyle: "none",
      borderRightWidth: "0px",
      borderTopStyle: "none",
      borderTopWidth: "0px",
      boxShadow: "none",
      outlineStyle: "none",
    },
    styleOverrides,
  );

const createElement = (styleOverrides: object = {}): Element =>
  Object.assign(Object.create(null), {
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => createComputedStyle(styleOverrides),
      },
    },
  });

describe("hasElementBoxPaint", () => {
  it.each([
    "transparent",
    "rgba(0, 0, 0, 0)",
    "rgba(255, 0, 0, 0.000)",
    "rgb(255 0 0 / 0)",
    "color(display-p3 1 0 0 / 0%)",
    "oklch(62% 0.2 20 / 0)",
  ])("treats a %s background as unpainted", (backgroundColor) => {
    expect(hasElementBoxPaint(createElement({ backgroundColor }))).toBe(false);
  });

  it.each([
    { backgroundColor: "rgb(34, 34, 34)" },
    { backgroundColor: "rgba(34, 34, 34, 0.01)" },
    { backgroundImage: "linear-gradient(red, blue)" },
    { borderTopStyle: "solid", borderTopWidth: "1px" },
    { boxShadow: "rgb(0, 0, 0) 0px 1px 2px" },
    { outlineStyle: "solid" },
  ])("treats box paint as full-box geometry", (styleOverrides) => {
    expect(hasElementBoxPaint(createElement(styleOverrides))).toBe(true);
  });

  it("does not expand a background clipped to glyphs", () => {
    const element = createElement({
      backgroundClip: "text",
      backgroundColor: "rgb(34, 34, 34)",
      backgroundImage: "linear-gradient(red, blue)",
    });

    expect(hasElementBoxPaint(element)).toBe(false);
  });
});
