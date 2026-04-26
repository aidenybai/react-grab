import { describe, expect, it } from "vite-plus/test";
import { hasErrorCode } from "../src/utils/has-error-code.js";

describe("hasErrorCode", () => {
  it("returns true when an Error has the matching code", () => {
    const error = new Error("boom") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    expect(hasErrorCode(error, "ENOENT")).toBe(true);
  });

  it("returns false when the Error has a different code", () => {
    const error = new Error("boom") as NodeJS.ErrnoException;
    error.code = "EACCES";
    expect(hasErrorCode(error, "ENOENT")).toBe(false);
  });

  it("returns false when the Error has no code", () => {
    expect(hasErrorCode(new Error("boom"), "ENOENT")).toBe(false);
  });

  it("returns false for non-Error inputs", () => {
    expect(hasErrorCode("ENOENT", "ENOENT")).toBe(false);
    expect(hasErrorCode({ code: "ENOENT" }, "ENOENT")).toBe(false);
    expect(hasErrorCode(null, "ENOENT")).toBe(false);
    expect(hasErrorCode(undefined, "ENOENT")).toBe(false);
  });
});
