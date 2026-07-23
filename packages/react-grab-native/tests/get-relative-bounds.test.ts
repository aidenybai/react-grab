import { describe, expect, it } from "vite-plus/test";
import { getRelativeBounds } from "../src/utils/get-relative-bounds";

describe("getRelativeBounds", () => {
  it("preserves window bounds when parent measurement is unavailable", () => {
    const bounds = { x: 20, y: 30, width: 100, height: 50 };

    expect(getRelativeBounds(bounds, null)).toEqual(bounds);
  });

  it("translates window bounds into parent coordinates", () => {
    expect(
      getRelativeBounds(
        { x: 20, y: 30, width: 100, height: 50 },
        { x: 5, y: 10, width: 300, height: 400 },
      ),
    ).toEqual({ x: 15, y: 20, width: 100, height: 50 });
  });
});
