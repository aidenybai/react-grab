import { describe, expect, it } from "vite-plus/test";
import { safeDecodeURIComponent } from "../src/utils/safe-decode-uri-component.js";

describe("safeDecodeURIComponent", () => {
  it("decodes percent-encoded input", () => {
    expect(safeDecodeURIComponent("%40radix-ui%2Freact-tabs")).toBe("@radix-ui/react-tabs");
    expect(safeDecodeURIComponent("a%20b")).toBe("a b");
  });

  it("returns the input unchanged when it is not valid encoding", () => {
    // A lone `%` is a malformed escape sequence that throws in
    // decodeURIComponent; the helper must fall back to the raw input.
    expect(safeDecodeURIComponent("100%")).toBe("100%");
    expect(safeDecodeURIComponent("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("passes through input with nothing to decode", () => {
    expect(safeDecodeURIComponent("plain-text")).toBe("plain-text");
  });
});
