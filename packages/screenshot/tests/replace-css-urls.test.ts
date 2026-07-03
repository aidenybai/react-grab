import { describe, expect, it } from "vite-plus/test";
import { replaceCssUrls } from "../src/utils/replace-css-urls";

const upperCaseUrl = (url: string): Promise<string> => Promise.resolve(url.toUpperCase());

describe("replaceCssUrls", () => {
  it("returns the value unchanged when it contains no urls", async () => {
    expect(await replaceCssUrls("linear-gradient(red, blue)", upperCaseUrl)).toBe(
      "linear-gradient(red, blue)",
    );
  });

  it("rewrites unquoted, single-quoted, and double-quoted urls", async () => {
    expect(await replaceCssUrls("url(a.png)", upperCaseUrl)).toBe('url("A.PNG")');
    expect(await replaceCssUrls("url('a.png')", upperCaseUrl)).toBe('url("A.PNG")');
    expect(await replaceCssUrls('url("a.png")', upperCaseUrl)).toBe('url("A.PNG")');
  });

  it("rewrites every url in a multi-url value and preserves surrounding text", async () => {
    expect(await replaceCssUrls('url(a.png), url("b.png") no-repeat', upperCaseUrl)).toBe(
      'url("A.PNG"), url("B.PNG") no-repeat',
    );
  });

  it("unescapes quoted urls before replacing and re-escapes quotes in the result", async () => {
    expect(await replaceCssUrls('url("a\\"b.png")', (url) => Promise.resolve(url))).toBe(
      'url("a\\"b.png")',
    );
  });

  it("ignores whitespace padding inside the url function", async () => {
    expect(await replaceCssUrls('url(  "a.png"  )', upperCaseUrl)).toBe('url("A.PNG")');
  });
});
