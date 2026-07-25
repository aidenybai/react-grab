import { describe, expect, it } from "vite-plus/test";
import { shouldIncludeElementSelector } from "../src/utils/should-include-element-selector.js";

describe("shouldIncludeElementSelector", () => {
  it("includes structural selectors when source context needs a fallback", () => {
    expect(
      shouldIncludeElementSelector(true, {
        selector: "main > button:nth-child(2)",
        isSemantic: false,
      }),
    ).toBe(true);
  });

  it("includes semantic selectors alongside trusted source context", () => {
    expect(
      shouldIncludeElementSelector(false, {
        selector: '[data-testid="submit"]',
        isSemantic: true,
      }),
    ).toBe(true);
  });

  it("omits structural selectors when trusted source context is available", () => {
    expect(
      shouldIncludeElementSelector(false, {
        selector: "main > button:nth-child(2)",
        isSemantic: false,
      }),
    ).toBe(false);
  });
});
