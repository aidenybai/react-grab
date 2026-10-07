import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { convertParentPositionToIframe } from "../src/utils/convert-parent-position-to-iframe.js";
import { convertTopWindowPositionToClient } from "../src/utils/convert-top-window-position-to-client.js";
import { getWindowFrameElement } from "../src/utils/get-window-frame-element.js";

vi.mock("../src/utils/convert-parent-position-to-iframe.js", () => ({
  convertParentPositionToIframe: vi.fn((_frameElement, clientX, clientY) => ({
    x: clientX - 10,
    y: clientY - 20,
  })),
}));

vi.mock("../src/utils/get-window-frame-element.js", () => ({
  getWindowFrameElement: vi.fn(),
}));

vi.mock("../src/utils/is-iframe-element.js", () => ({
  isIframeElement: vi.fn(() => true),
}));

const topWindow: Window = Object.assign(Object.create(null), {});

beforeEach(() => {
  vi.stubGlobal("window", topWindow);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("convertTopWindowPositionToClient", () => {
  it("converts from the outermost frame into nested iframe coordinates", () => {
    const outerFrame: HTMLIFrameElement = Object.assign(Object.create(null), {
      ownerDocument: { defaultView: topWindow },
    });
    const outerFrameWindow: Window = Object.assign(Object.create(null), {});
    const innerFrame: HTMLIFrameElement = Object.assign(Object.create(null), {
      ownerDocument: { defaultView: outerFrameWindow },
    });
    const innerFrameWindow: Window = Object.assign(Object.create(null), {});
    vi.mocked(getWindowFrameElement).mockImplementation((targetWindow) => {
      if (targetWindow === innerFrameWindow) return innerFrame;
      if (targetWindow === outerFrameWindow) return outerFrame;
      return null;
    });

    expect(convertTopWindowPositionToClient(innerFrameWindow, 100, 120)).toEqual({
      x: 80,
      y: 80,
    });
    expect(convertParentPositionToIframe).toHaveBeenNthCalledWith(1, outerFrame, 100, 120);
    expect(convertParentPositionToIframe).toHaveBeenNthCalledWith(2, innerFrame, 90, 100);
  });

  it("leaves top-window coordinates unchanged", () => {
    expect(convertTopWindowPositionToClient(topWindow, 100, 120)).toEqual({ x: 100, y: 120 });
    expect(convertParentPositionToIframe).not.toHaveBeenCalled();
  });
});
