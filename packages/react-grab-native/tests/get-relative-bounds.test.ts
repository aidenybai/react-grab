import { describe, expect, it } from "vite-plus/test";
import { getRelativeBounds } from "../src/utils/get-relative-bounds";

describe("getRelativeBounds", () => {
  it("does not use window coordinates when parent measurement is unavailable", () => {
    expect(getRelativeBounds({ x: 20, y: 30, width: 100, height: 50 }, null)).toBeNull();
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
