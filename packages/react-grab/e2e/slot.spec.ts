import { expect, test } from "@playwright/test";
import { createSlotRenderSegments } from "../src/utils/create-slot-render-segments.js";

test.describe("Slot", () => {
  test("keeps decimal literals in the rendered character stream", () => {
    const renderSegments = createSlotRenderSegments("-13.5px");
    const rightAlignedText = [...renderSegments.rightAlignedSegments]
      .reverse()
      .map((segment) => segment.value)
      .join("");

    expect(`${renderSegments.prefixLiterals.join("")}${rightAlignedText}`).toBe("-13.5px");
    expect(
      renderSegments.rightAlignedSegments.map((segment) => [
        segment.value,
        segment.digitDistanceFromRight,
      ]),
    ).toEqual([
      ["x", 0],
      ["p", 0],
      ["5", 0],
      [".", 1],
      ["3", 1],
      ["1", 2],
    ]);
  });
});
