import { describe, expect, it } from "vite-plus/test";
import { findTailwindClass } from "../src/utils/find-tailwind-class.js";

describe("findTailwindClass", () => {
  it("returns null for property keys without a chip rule", () => {
    expect(findTailwindClass("color", 0)).toBe(null);
    expect(findTailwindClass("font-size", 16)).toBe(null);
  });

  describe("spacing scale", () => {
    it("maps a 4px unit to the chip number", () => {
      expect(findTailwindClass("padding", 0)).toBe("p-0");
      expect(findTailwindClass("padding", 16)).toBe("p-4");
      expect(findTailwindClass("margin-left", 8)).toBe("ml-2");
    });

    it("names the most-specific prefix for aggregate rows", () => {
      expect(findTailwindClass("padding-top,padding-bottom", 8)).toBe("py-2");
      expect(findTailwindClass("width,height", 16)).toBe("size-4");
      expect(findTailwindClass("top,right,bottom,left", 0)).toBe("inset-0");
    });

    it("returns null for negative, non-integer-unit, or out-of-range values", () => {
      expect(findTailwindClass("padding", -4)).toBe(null);
      expect(findTailwindClass("padding", 6)).toBe(null);
      // 96 units (384px) is the max; one unit past it falls back to null.
      expect(findTailwindClass("padding", 384)).toBe("p-96");
      expect(findTailwindClass("padding", 388)).toBe(null);
    });
  });

  describe("border-width scale", () => {
    it("uses the suffix-less form for a 1px border", () => {
      expect(findTailwindClass("border-width", 1)).toBe("border");
      expect(findTailwindClass("border-top-width", 1)).toBe("border-t");
    });

    it("uses a numeric suffix for other integer widths", () => {
      expect(findTailwindClass("border-width", 0)).toBe("border-0");
      expect(findTailwindClass("border-width", 2)).toBe("border-2");
      expect(findTailwindClass("border-left-width", 4)).toBe("border-l-4");
      expect(findTailwindClass("border-width", 8)).toBe("border-8");
    });

    it("returns null for negative, non-integer, or out-of-range widths", () => {
      expect(findTailwindClass("border-width", -1)).toBe(null);
      expect(findTailwindClass("border-width", 1.5)).toBe(null);
      expect(findTailwindClass("border-width", 10)).toBe(null);
    });
  });

  describe("z-index scale", () => {
    it("maps integers in range to the chip number", () => {
      expect(findTailwindClass("z-index", 0)).toBe("z-0");
      expect(findTailwindClass("z-index", 10)).toBe("z-10");
      expect(findTailwindClass("z-index", 50)).toBe("z-50");
    });

    it("returns null for negative, non-integer, or out-of-range values", () => {
      expect(findTailwindClass("z-index", -1)).toBe(null);
      expect(findTailwindClass("z-index", 1.5)).toBe(null);
      expect(findTailwindClass("z-index", 60)).toBe(null);
    });
  });

  describe("opacity scale", () => {
    it("maps percent values on the 5% step to the chip number", () => {
      expect(findTailwindClass("opacity", 0)).toBe("opacity-0");
      expect(findTailwindClass("opacity", 55)).toBe("opacity-55");
      expect(findTailwindClass("opacity", 100)).toBe("opacity-100");
    });

    it("returns null off the 5% step, out of range, or non-finite", () => {
      expect(findTailwindClass("opacity", 52)).toBe(null);
      expect(findTailwindClass("opacity", -5)).toBe(null);
      expect(findTailwindClass("opacity", 105)).toBe(null);
      expect(findTailwindClass("opacity", Number.POSITIVE_INFINITY)).toBe(null);
      expect(findTailwindClass("opacity", Number.NaN)).toBe(null);
    });
  });
});
