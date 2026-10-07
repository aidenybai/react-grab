import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { OpenFileError } from "../src/errors.js";
import { requestOpenFile } from "../src/utils/open-file.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestOpenFile", () => {
  it("throws a typed error when the fallback opener fails", async () => {
    const cause = new Error("blocked");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no dev server")));
    vi.stubGlobal("window", {
      open: vi.fn(() => {
        throw cause;
      }),
    });

    const pendingOpen = requestOpenFile("/src/button.tsx", 12);

    await expect(pendingOpen).rejects.toMatchObject({
      name: "OpenFileError",
      filePath: "/src/button.tsx",
      lineNumber: 12,
      cause,
    });
    await expect(pendingOpen).rejects.toBeInstanceOf(OpenFileError);
  });
});
