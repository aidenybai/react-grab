import { describe, expect, it } from "vite-plus/test";
import { stripInvalidXmlCharacters } from "../src/utils/strip-invalid-xml-characters";

describe("stripInvalidXmlCharacters", () => {
  it("returns valid text unchanged", () => {
    expect(stripInvalidXmlCharacters("hello world \n\t \u{1F600}")).toBe(
      "hello world \n\t \u{1F600}",
    );
  });

  it("removes C0 control characters and U+FFFE/U+FFFF", () => {
    expect(stripInvalidXmlCharacters("a\u0000b\u000Bc\uFFFEd\uFFFFe")).toBe("abcde");
  });

  it("replaces lone surrogates with the replacement character", () => {
    expect(stripInvalidXmlCharacters("a\uD800b")).toBe("a\uFFFDb");
    expect(stripInvalidXmlCharacters("a\uDC00b")).toBe("a\uFFFDb");
  });

  it("keeps well-formed surrogate pairs", () => {
    expect(stripInvalidXmlCharacters("\u{1F600}")).toBe("\u{1F600}");
  });
});
