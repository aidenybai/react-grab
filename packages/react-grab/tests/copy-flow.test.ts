import { describe, expect, it, vi } from "vite-plus/test";
import { runCopyFlow } from "../src/core/copy.js";

const createHooks = () => ({
  onBeforeCopy: vi.fn(async () => {}),
  transformCopyContent: vi.fn(async (content: string) => content),
  onAfterCopy: vi.fn(),
  onCopySuccess: vi.fn(),
  onCopyError: vi.fn(),
});

describe("runCopyFlow", () => {
  it("stops after content resolves when the copy was cancelled", async () => {
    const abortController = new AbortController();
    const content = Promise.withResolvers<string>();
    const contentRequested = Promise.withResolvers<void>();
    const hooks = createHooks();
    const pendingCopy = runCopyFlow(
      {
        getContent: () => {
          contentRequested.resolve();
          return content.promise;
        },
        signal: abortController.signal,
      },
      hooks,
      [Object.create(null)],
    );

    await contentRequested.promise;
    abortController.abort();

    expect(await pendingCopy).toEqual({ status: "cancelled" });
    content.resolve("late content");
    expect(hooks.transformCopyContent).not.toHaveBeenCalled();
    expect(hooks.onCopySuccess).not.toHaveBeenCalled();
    expect(hooks.onCopyError).not.toHaveBeenCalled();
    expect(hooks.onAfterCopy).not.toHaveBeenCalled();
  });

  it("stops before writing when a transform resolves after cancellation", async () => {
    const abortController = new AbortController();
    const transformedContent = Promise.withResolvers<string>();
    const transformStarted = Promise.withResolvers<void>();
    const hooks = createHooks();
    hooks.transformCopyContent.mockImplementation(() => {
      transformStarted.resolve();
      return transformedContent.promise;
    });
    const pendingCopy = runCopyFlow(
      {
        getContent: () => "content",
        signal: abortController.signal,
      },
      hooks,
      [Object.create(null)],
    );

    await transformStarted.promise;
    abortController.abort();

    expect(await pendingCopy).toEqual({ status: "cancelled" });
    transformedContent.resolve("late transformed content");
    expect(hooks.onCopySuccess).not.toHaveBeenCalled();
    expect(hooks.onCopyError).not.toHaveBeenCalled();
    expect(hooks.onAfterCopy).not.toHaveBeenCalled();
  });

  it("treats empty content as cancelled when abort wins before continuation", async () => {
    const abortController = new AbortController();
    const content = Promise.withResolvers<string>();
    const hooks = createHooks();
    const pendingCopy = runCopyFlow(
      {
        getContent: () => content.promise,
        signal: abortController.signal,
      },
      hooks,
      [Object.create(null)],
    );

    content.resolve("");
    abortController.abort();

    expect(await pendingCopy).toEqual({ status: "cancelled" });
    expect(hooks.onCopyError).not.toHaveBeenCalled();
    expect(hooks.onAfterCopy).not.toHaveBeenCalled();
  });
});
