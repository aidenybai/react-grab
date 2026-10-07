import { describe, expect, it } from "vite-plus/test";
import { createVariants } from "../src/utils/create-variants.js";

describe("createVariants", () => {
  const button = createVariants("base", {
    variants: {
      variant: { solid: "solid-class", ghost: "ghost-class" },
      size: { sm: "sm-class", lg: "lg-class" },
    },
    defaultVariants: { variant: "solid" },
  });

  it("applies the default variant when none is selected", () => {
    expect(button()).toBe("base solid-class");
  });

  it("applies the selected variant over the default", () => {
    expect(button({ variant: "ghost" })).toBe("base ghost-class");
  });

  it("combines multiple variant groups", () => {
    expect(button({ variant: "ghost", size: "lg" })).toBe("base ghost-class lg-class");
  });

  it("omits groups without a default or selection", () => {
    expect(button({ size: "sm" })).toBe("base solid-class sm-class");
  });

  it("returns just the base when no variants are configured", () => {
    expect(createVariants("only-base")()).toBe("only-base");
  });
});
