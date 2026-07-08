import { describe, expect, it } from "vite-plus/test";
import { buildIndeterminateCheckboxStyle } from "../src/utils/build-indeterminate-checkbox-style";

describe("buildIndeterminateCheckboxStyle", () => {
  it("disables native appearance and paints a data-url replica", () => {
    const style = buildIndeterminateCheckboxStyle(13, 13, "rgb(0, 117, 255)");
    expect(style).toContain("appearance:none");
    expect(style).toContain('background-image:url("data:image/svg+xml,');
    expect(style).toContain("background-size:100% 100%");
  });

  it("insets the dash 20% horizontally and 40% vertically", () => {
    const style = buildIndeterminateCheckboxStyle(20, 10, "rgb(192, 57, 43)");
    const replicaSvg = decodeURIComponent(style.split("data:image/svg+xml,")[1].split('")')[0]);
    expect(replicaSvg).toContain("<rect x='4' y='4' width='12' height='2' rx='1'");
    expect(replicaSvg).toContain("fill='rgb(192, 57, 43)'");
  });
});
