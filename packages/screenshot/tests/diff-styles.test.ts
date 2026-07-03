import { describe, expect, it } from "vite-plus/test";
import {
  applyRootStyleOverrides,
  applySizeFreezingPolicy,
  diffMarkerStyles,
  diffStyles,
} from "../src/capture/diff-styles";

describe("diffStyles", () => {
  it("drops properties equal to the baseline", () => {
    const diffed = diffStyles({
      styles: { color: "rgb(255, 0, 0)", display: "block" },
      baseline: { color: "rgb(0, 0, 0)", display: "block" },
      parentStyles: null,
      parentEmittedStyles: null,
    });
    expect(diffed).toEqual({ color: "rgb(255, 0, 0)" });
  });

  it("always emits concrete-value properties even when baseline-equal", () => {
    const diffed = diffStyles({
      styles: { width: "100px", "box-sizing": "content-box" },
      baseline: { width: "100px", "box-sizing": "content-box" },
      parentStyles: null,
      parentEmittedStyles: null,
    });
    expect(diffed["width"]).toBe("100px");
    expect(diffed["box-sizing"]).toBe("content-box");
  });

  it("omits currentColor-default properties that match the element color", () => {
    const diffed = diffStyles({
      styles: {
        color: "rgb(255, 0, 0)",
        "border-top-color": "rgb(255, 0, 0)",
        "outline-color": "rgb(0, 0, 255)",
      },
      baseline: { color: "rgb(255, 0, 0)" },
      parentStyles: null,
      parentEmittedStyles: null,
    });
    expect(diffed["border-top-color"]).toBeUndefined();
    expect(diffed["outline-color"]).toBe("rgb(0, 0, 255)");
  });

  it("re-emits an inherited property the parent emitted when the child diverges", () => {
    const diffed = diffStyles({
      styles: { "text-align": "left" },
      baseline: { "text-align": "left" },
      parentStyles: { "text-align": "center" },
      parentEmittedStyles: { "text-align": "center" },
    });
    expect(diffed["text-align"]).toBe("left");
  });
});

describe("diffMarkerStyles", () => {
  it("returns null when there is no marker snapshot", () => {
    expect(diffMarkerStyles(null, { color: "rgb(0, 0, 0)" })).toBeNull();
  });

  it("keeps only marker-applicable properties that diverge from the element", () => {
    const diffed = diffMarkerStyles(
      {
        color: "rgb(192, 57, 43)",
        "font-size": "19px",
        "background-color": "rgb(255, 0, 0)",
        display: "inline",
      },
      { color: "rgb(29, 39, 49)", "font-size": "15px" },
    );
    expect(diffed).toEqual({ color: "rgb(192, 57, 43)", "font-size": "19px" });
  });

  it("omits marker properties equal to the element's own values", () => {
    const diffed = diffMarkerStyles(
      { color: "rgb(29, 39, 49)", "font-size": "15px", content: "normal" },
      { color: "rgb(29, 39, 49)", "font-size": "15px" },
    );
    expect(diffed).toBeNull();
  });

  it("emits authored marker content but never the default normal", () => {
    const diffed = diffMarkerStyles(
      { content: '"→ "', color: "rgb(31, 122, 77)" },
      { color: "rgb(29, 39, 49)" },
    );
    expect(diffed).toEqual({ content: '"→ "', color: "rgb(31, 122, 77)" });
  });
});

describe("applySizeFreezingPolicy", () => {
  it("removes frozen sizes from non-replaced inline elements", () => {
    const diffed = { width: "80px", height: "20px", display: "inline" };
    applySizeFreezingPolicy(diffed, { display: "inline" }, null, false, "span");
    expect(diffed["width"]).toBeUndefined();
    expect(diffed["height"]).toBeUndefined();
  });

  it("converts table cell widths into min-width floors", () => {
    const diffed = { width: "120px", height: "40px" };
    applySizeFreezingPolicy(diffed, { width: "120px" }, null, false, "td");
    expect(diffed["width"]).toBeUndefined();
    expect(diffed["height"]).toBeUndefined();
    expect(diffed["min-width"]).toBe("120px");
  });

  it("pins flex items so frozen sizes stay authoritative", () => {
    const diffed: Record<string, string> = {};
    applySizeFreezingPolicy(diffed, { "min-width": "auto" }, "flex", false, "div");
    expect(diffed["flex-grow"]).toBe("0");
    expect(diffed["flex-shrink"]).toBe("0");
    expect(diffed["flex-basis"]).toBe("auto");
    expect(diffed["min-width"]).toBe("0px");
  });
});

describe("applyRootStyleOverrides", () => {
  it("neutralizes positioning and pins the capture size", () => {
    const diffed = {
      position: "fixed",
      transform: "matrix(1, 0, 0, 1, 10, 10)",
      "margin-left": "12px",
      "inline-size": "300px",
    };
    applyRootStyleOverrides(diffed, {
      layoutWidthPx: 300,
      layoutHeightPx: 150,
      outputWidthPx: 300,
      outputHeightPx: 150,
      contentOffsetLeftPx: 0,
      contentOffsetTopPx: 0,
      rootLinearTransform: null,
    });
    expect(diffed["position"]).toBe("relative");
    expect(diffed["transform"]).toBe("none");
    expect(diffed["margin-left"]).toBe("0px");
    expect(diffed["width"]).toBe("300px");
    expect(diffed["height"]).toBe("150px");
    expect(diffed["inline-size"]).toBeUndefined();
  });

  it("keeps a transformed root's combined matrix and anchors it at the output offset", () => {
    const diffed = {
      position: "static",
      transform: "matrix(0.8, 0.2, -0.2, 0.8, 5, 5)",
      rotate: "15deg",
      "transform-origin": "150px 75px",
    };
    applyRootStyleOverrides(diffed, {
      layoutWidthPx: 300,
      layoutHeightPx: 150,
      outputWidthPx: 340,
      outputHeightPx: 220,
      contentOffsetLeftPx: 30,
      contentOffsetTopPx: 12,
      rootLinearTransform: { a: 0.8, b: 0.2, c: -0.2, d: 0.8 },
    });
    expect(diffed["position"]).toBe("relative");
    expect(diffed["left"]).toBe("30px");
    expect(diffed["top"]).toBe("12px");
    expect(diffed["transform"]).toBe("matrix(0.8, 0.2, -0.2, 0.8, 0, 0)");
    expect(diffed["transform-origin"]).toBe("0px 0px");
    expect(diffed["rotate"]).toBe("none");
    expect(diffed["width"]).toBe("300px");
    expect(diffed["height"]).toBe("150px");
  });
});
