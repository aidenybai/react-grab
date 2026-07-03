import { describe, expect, it } from "vite-plus/test";
import { findInheritedBackgroundColor } from "../src/utils/find-inherited-background-color";

const buildNestedDivs = (backgroundColors: (string | null)[]): HTMLElement => {
  let currentParent: HTMLElement = document.body;
  let innermost: HTMLElement = document.body;
  for (const backgroundColor of backgroundColors) {
    const wrapper = document.createElement("div");
    if (backgroundColor) wrapper.style.backgroundColor = backgroundColor;
    currentParent.appendChild(wrapper);
    currentParent = wrapper;
    innermost = wrapper;
  }
  return innermost;
};

describe("findInheritedBackgroundColor", () => {
  it("returns the nearest ancestor's non-transparent background color", () => {
    const target = buildNestedDivs(["rgb(255, 0, 0)", "rgb(0, 128, 0)", null, null]);
    expect(findInheritedBackgroundColor(target)).toBe("rgb(0, 128, 0)");
    target.parentElement?.parentElement?.parentElement?.remove();
  });

  it("skips transparent ancestors", () => {
    const target = buildNestedDivs(["rgb(255, 0, 0)", "transparent", "rgba(0, 0, 0, 0)", null]);
    expect(findInheritedBackgroundColor(target)).toBe("rgb(255, 0, 0)");
    target.parentElement?.parentElement?.parentElement?.remove();
  });

  it("returns an empty string when no ancestor paints a background", () => {
    const target = buildNestedDivs([null, null]);
    expect(findInheritedBackgroundColor(target)).toBe("");
    target.parentElement?.remove();
  });

  it("hops from a shadow root to its host", () => {
    const host = document.createElement("div");
    host.style.backgroundColor = "rgb(0, 0, 255)";
    document.body.appendChild(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    const shadowChild = document.createElement("div");
    shadowRoot.appendChild(shadowChild);
    expect(findInheritedBackgroundColor(shadowChild)).toBe("rgb(0, 0, 255)");
    host.remove();
  });
});
