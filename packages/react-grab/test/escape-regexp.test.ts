import { describe, expect, it } from "vite-plus/test";
import { escapeRegExp } from "../src/utils/escape-regexp.js";

describe("escapeRegExp", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves plain alphanumerics untouched", () => {
    expect(escapeRegExp("MyComponent_42")).toBe("MyComponent_42");
  });

  it("produces a regex source that matches the original string literally", () => {
    const input = "a.b+c[d]";
    const pattern = new RegExp(`^${escapeRegExp(input)}$`);
    expect(pattern.test(input)).toBe(true);
    expect(pattern.test("aXbXcXdX")).toBe(false);
  });
});
