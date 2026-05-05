import { describe, expect, it } from "vite-plus/test";
import { findLongestCommonSuffix } from "../src/utils/find-longest-common-suffix.js";

describe("findLongestCommonSuffix", () => {
  it("returns an empty array when no lists are provided", () => {
    expect(findLongestCommonSuffix([])).toEqual([]);
  });

  it("returns an empty array when any list is empty", () => {
    expect(findLongestCommonSuffix([["a", "b"], []])).toEqual([]);
  });

  it("returns the full list when there is only one list", () => {
    expect(findLongestCommonSuffix([["a", "b", "c"]])).toEqual(["a", "b", "c"]);
  });

  it("returns the shared suffix between two lists", () => {
    expect(
      findLongestCommonSuffix([
        ["x", "common", "tail"],
        ["y", "z", "common", "tail"],
      ]),
    ).toEqual(["common", "tail"]);
  });

  it("returns an empty array when no suffix is shared", () => {
    expect(
      findLongestCommonSuffix([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toEqual([]);
  });

  it("compares by strict equality across many lists", () => {
    expect(
      findLongestCommonSuffix([
        ["1", "shared"],
        ["2", "shared"],
        ["3", "shared"],
      ]),
    ).toEqual(["shared"]);
  });

  it("returns an empty array if a single list breaks the suffix", () => {
    expect(
      findLongestCommonSuffix([
        ["x", "common"],
        ["y", "common"],
        ["z", "different"],
      ]),
    ).toEqual([]);
  });
});
