import { describe, expect, it } from "vite-plus/test";
import type { Rect } from "../src/types.js";
import { subtractRect } from "../src/utils/subtract-rect.js";

const viewportRect: Rect = { left: 0, top: 0, right: 100, bottom: 100 };

const totalArea = (rects: readonly Rect[]): number =>
  rects.reduce((area, rect) => area + (rect.right - rect.left) * (rect.bottom - rect.top), 0);

const containsPoint = (rects: readonly Rect[], x: number, y: number): boolean =>
  rects.some((rect) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom);

describe("subtractRect", () => {
  it("keeps rects that do not overlap the hole", () => {
    expect(subtractRect([viewportRect], { left: 200, top: 200, right: 300, bottom: 300 })).toEqual([
      viewportRect,
    ]);
  });

  it("keeps rects that only touch the hole edge", () => {
    expect(subtractRect([viewportRect], { left: 100, top: 0, right: 200, bottom: 100 })).toEqual([
      viewportRect,
    ]);
  });

  it("splits a fully enclosed hole into four pieces", () => {
    const remainingRects = subtractRect([viewportRect], {
      left: 40,
      top: 40,
      right: 60,
      bottom: 60,
    });

    expect(remainingRects).toHaveLength(4);
    expect(totalArea(remainingRects)).toBe(100 * 100 - 20 * 20);
    expect(containsPoint(remainingRects, 50, 50)).toBe(false);
    expect(containsPoint(remainingRects, 39, 50)).toBe(true);
    expect(containsPoint(remainingRects, 50, 61)).toBe(true);
  });

  it("drops a rect the hole covers entirely", () => {
    expect(subtractRect([viewportRect], { left: -10, top: -10, right: 110, bottom: 110 })).toEqual(
      [],
    );
  });

  it("cuts every hole out when applied in sequence", () => {
    const firstHole: Rect = { left: 0, top: 0, right: 20, bottom: 20 };
    const secondHole: Rect = { left: 80, top: 80, right: 100, bottom: 100 };
    const remainingRects = subtractRect(subtractRect([viewportRect], firstHole), secondHole);

    expect(totalArea(remainingRects)).toBe(100 * 100 - 20 * 20 - 20 * 20);
    expect(containsPoint(remainingRects, 10, 10)).toBe(false);
    expect(containsPoint(remainingRects, 90, 90)).toBe(false);
    expect(containsPoint(remainingRects, 50, 50)).toBe(true);
  });
});
