import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { copyContent } from "../src/utils/copy-content.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyContent", () => {
  it("removes the copy listener when textarea setup fails", () => {
    const copyListeners = new Set<EventListenerOrEventListenerObject>();
    const setupError = new Error("append failed");
    const textarea = {
      value: "",
      style: { position: "", left: "" },
      ariaHidden: "",
      select: vi.fn(),
      remove: vi.fn(),
    };
    vi.stubGlobal("document", {
      addEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
        copyListeners.add(listener);
      },
      removeEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
        copyListeners.delete(listener);
      },
      createElement: () => textarea,
      body: {
        appendChild: () => {
          throw setupError;
        },
      },
    });

    expect(() => copyContent("content")).toThrow(setupError);
    expect(copyListeners.size).toBe(0);
    expect(textarea.remove).toHaveBeenCalledOnce();
  });
});
