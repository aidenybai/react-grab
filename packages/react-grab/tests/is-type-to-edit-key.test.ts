import { describe, expect, it } from "vite-plus/test";
import { isTypeToEditKey } from "../src/utils/is-type-to-edit-key.js";

describe("isTypeToEditKey", () => {
  it.each([
    ["m", true],
    ["7", true],
    ["-", true],
    ["ArrowRight", false],
    [" ", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("classifies %j", (key, expected) => {
    expect(isTypeToEditKey(key)).toBe(expected);
  });
});
