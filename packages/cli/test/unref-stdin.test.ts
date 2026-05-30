import { vi, describe, expect, it, afterEach } from "vite-plus/test";
import { unrefStdin } from "../src/utils/unref-stdin.js";

const originalIsTTY = process.stdin.isTTY;

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, configurable: true });
  vi.restoreAllMocks();
});

describe("unrefStdin", () => {
  it("does not unref an interactive TTY", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
    const unref = vi.spyOn(process.stdin, "unref").mockImplementation(() => process.stdin);

    unrefStdin();

    expect(unref).not.toHaveBeenCalled();
  });

  it("unrefs a non-TTY (inherited pipe) stdin", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
    const unref = vi.spyOn(process.stdin, "unref").mockImplementation(() => process.stdin);

    unrefStdin();

    expect(unref).toHaveBeenCalledTimes(1);
  });
});
