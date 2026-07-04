import { describe, expect, it } from "vite-plus/test";
import {
  CopyFailedError,
  NonElementNodeError,
  ReactGrabError,
  SelectorNotFoundError,
  SelectorTimeoutError,
} from "../src/errors.js";

describe("react-grab errors", () => {
  it("ReactGrabError carries the given message and name", () => {
    const error = new ReactGrabError("boom");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ReactGrabError");
    expect(error.message).toBe("boom");
  });

  it("NonElementNodeError has a fixed message and subclasses ReactGrabError", () => {
    const error = new NonElementNodeError();
    expect(error).toBeInstanceOf(ReactGrabError);
    expect(error.name).toBe("NonElementNodeError");
    expect(error.message).toBe("Can't generate CSS selector for non-element node type.");
  });

  it("SelectorTimeoutError reports the timeout in its message and field", () => {
    const error = new SelectorTimeoutError(250);
    expect(error).toBeInstanceOf(ReactGrabError);
    expect(error.name).toBe("SelectorTimeoutError");
    expect(error.timeoutMs).toBe(250);
    expect(error.message).toBe("Timeout: Can't find a unique selector after 250ms");
  });

  it("SelectorNotFoundError has a fixed message", () => {
    const error = new SelectorNotFoundError();
    expect(error).toBeInstanceOf(ReactGrabError);
    expect(error.name).toBe("SelectorNotFoundError");
    expect(error.message).toBe("Selector was not found.");
  });

  it("CopyFailedError has a fixed message", () => {
    const error = new CopyFailedError();
    expect(error).toBeInstanceOf(ReactGrabError);
    expect(error.name).toBe("CopyFailedError");
    expect(error.message).toBe("Failed to copy");
  });
});
