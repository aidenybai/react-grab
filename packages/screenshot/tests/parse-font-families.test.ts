import { describe, expect, it } from "vite-plus/test";
import { parseFontFamilies } from "../src/utils/parse-font-families";

describe("parseFontFamilies", () => {
  it("returns an empty list for missing or empty values", () => {
    expect(parseFontFamilies(undefined)).toEqual([]);
    expect(parseFontFamilies("")).toEqual([]);
  });

  it("splits, trims, unquotes, and lowercases family names", () => {
    expect(parseFontFamilies(`"Inter Var", 'Roboto' , ARIAL`)).toEqual([
      "inter var",
      "roboto",
      "arial",
    ]);
  });

  it("drops generic families", () => {
    expect(parseFontFamilies('Inter, sans-serif, system-ui, "monospace"')).toEqual(["inter"]);
  });
});
