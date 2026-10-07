import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { executeOpenFileAction } from "../src/core/open-file-action.js";
import { OpenFileError } from "../src/errors.js";
import type { OpenFileActionHooks } from "../src/types.js";
import { requestOpenFile } from "../src/utils/open-file.js";

vi.mock("../src/utils/open-file.js", () => ({
  requestOpenFile: vi.fn(),
}));

const createHooks = (): OpenFileActionHooks => ({
  onOpenFile: vi.fn(),
  transformOpenFileUrl: vi.fn((url) => url),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("executeOpenFileAction", () => {
  it("does not fall back when a plugin handles the file", () => {
    const hooks = createHooks();
    vi.mocked(hooks.onOpenFile).mockReturnValue(true);

    executeOpenFileAction("/src/button.tsx", 12, hooks);

    expect(requestOpenFile).not.toHaveBeenCalled();
  });

  it("opens unhandled files with the plugin URL transform", () => {
    const hooks = createHooks();

    executeOpenFileAction("/src/button.tsx", 12, hooks);

    expect(requestOpenFile).toHaveBeenCalledWith("/src/button.tsx", 12, hooks.transformOpenFileUrl);
  });

  it("reports rejected UI opens once with source context", async () => {
    const cause = new Error("blocked");
    const hooks = createHooks();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(requestOpenFile).mockRejectedValue(cause);

    executeOpenFileAction("/src/button.tsx", 12, hooks);
    await Promise.resolve();

    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith("[react-grab]", expect.any(OpenFileError));
    expect(warning.mock.calls[0]?.[1]).toMatchObject({
      filePath: "/src/button.tsx",
      lineNumber: 12,
      cause,
    });
  });
});
