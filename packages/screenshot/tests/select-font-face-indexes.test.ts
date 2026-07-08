import { describe, expect, it } from "vitest";
import { parseFontFaceStyleKeyword } from "../src/utils/parse-font-face-style-keyword";
import { parseFontFaceWeightRange } from "../src/utils/parse-font-face-weight-range";
import {
  type FontFaceCandidate,
  selectFontFaceIndexes,
} from "../src/utils/select-font-face-indexes";

const face = (
  minWeight: number,
  maxWeight: number,
  styleKeyword: FontFaceCandidate["styleKeyword"] = "normal",
): FontFaceCandidate => ({ minWeight, maxWeight, styleKeyword });

describe("parseFontFaceWeightRange", () => {
  it("parses keywords, numbers, and ranges", () => {
    expect(parseFontFaceWeightRange("normal")).toEqual({ minWeight: 400, maxWeight: 400 });
    expect(parseFontFaceWeightRange("bold")).toEqual({ minWeight: 700, maxWeight: 700 });
    expect(parseFontFaceWeightRange("300")).toEqual({ minWeight: 300, maxWeight: 300 });
    expect(parseFontFaceWeightRange("100 900")).toEqual({ minWeight: 100, maxWeight: 900 });
    expect(parseFontFaceWeightRange("")).toEqual({ minWeight: 400, maxWeight: 400 });
  });

  it("rejects unparsable descriptors", () => {
    expect(parseFontFaceWeightRange("bolder")).toBeNull();
    expect(parseFontFaceWeightRange("calc(400)")).toBeNull();
    expect(parseFontFaceWeightRange("100 500 900")).toBeNull();
  });
});

describe("parseFontFaceStyleKeyword", () => {
  it("parses style keywords", () => {
    expect(parseFontFaceStyleKeyword("")).toBe("normal");
    expect(parseFontFaceStyleKeyword("Italic")).toBe("italic");
    expect(parseFontFaceStyleKeyword("oblique 10deg 20deg")).toBe("oblique");
    expect(parseFontFaceStyleKeyword("slanted")).toBeNull();
  });
});

describe("selectFontFaceIndexes", () => {
  it("keeps only faces reachable by the requested weights", () => {
    const candidates = [
      face(100, 100),
      face(300, 300),
      face(400, 400),
      face(700, 700),
      face(900, 900),
    ];
    const kept = selectFontFaceIndexes(candidates, [
      { weight: 400, styleKeyword: "normal" },
      { weight: 700, styleKeyword: "normal" },
    ]);
    expect([...kept].sort()).toEqual([2, 3]);
  });

  it("falls back below then above for weights 400-500", () => {
    const candidates = [face(300, 300), face(600, 600)];
    const kept = selectFontFaceIndexes(candidates, [{ weight: 400, styleKeyword: "normal" }]);
    expect([...kept]).toEqual([0]);
  });

  it("prefers the 400-500 window over below", () => {
    const candidates = [face(300, 300), face(500, 500)];
    const kept = selectFontFaceIndexes(candidates, [{ weight: 400, styleKeyword: "normal" }]);
    expect([...kept]).toEqual([1]);
  });

  it("prefers heavier faces for weights above 500", () => {
    const candidates = [face(400, 400), face(800, 800)];
    const kept = selectFontFaceIndexes(candidates, [{ weight: 700, styleKeyword: "normal" }]);
    expect([...kept]).toEqual([1]);
  });

  it("prefers lighter faces for weights below 400", () => {
    const candidates = [face(100, 100), face(400, 400)];
    const kept = selectFontFaceIndexes(candidates, [{ weight: 300, styleKeyword: "normal" }]);
    expect([...kept]).toEqual([0]);
  });

  it("treats variable ranges containing the weight as exact", () => {
    const candidates = [face(100, 900), face(700, 700)];
    const kept = selectFontFaceIndexes(candidates, [{ weight: 500, styleKeyword: "normal" }]);
    expect([...kept]).toEqual([0]);
  });

  it("filters by style before weight and falls back across styles", () => {
    const candidates = [
      face(400, 400, "normal"),
      face(400, 400, "italic"),
      face(700, 700, "italic"),
    ];
    const italicKept = selectFontFaceIndexes(candidates, [{ weight: 700, styleKeyword: "italic" }]);
    expect([...italicKept]).toEqual([2]);
    const normalOnly = [face(400, 400, "normal")];
    const fallbackKept = selectFontFaceIndexes(normalOnly, [
      { weight: 400, styleKeyword: "italic" },
    ]);
    expect([...fallbackKept]).toEqual([0]);
  });
});
