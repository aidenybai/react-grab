import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AUTO_SCROLL_EDGE_THRESHOLD_PX, AUTO_SCROLL_SPEED_PX } from "../src/constants.js";
import { createAutoScroller } from "../src/core/auto-scroll.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../src/utils/native-raf.js";

vi.mock("../src/utils/native-raf.js", () => ({
  nativeCancelAnimationFrame: vi.fn(),
  nativeRequestAnimationFrame: vi.fn(() => Number.MIN_SAFE_INTEGER),
}));

interface MutableScrollPosition {
  x: number;
  y: number;
}

const stubWindow = (scrollPosition: MutableScrollPosition) => {
  const scrollBy = vi.fn((options: ScrollToOptions) => {
    scrollPosition.x = Math.max(0, scrollPosition.x + (options.left ?? 0));
    scrollPosition.y = Math.max(0, scrollPosition.y + (options.top ?? 0));
  });
  vi.stubGlobal("window", {
    innerHeight: Infinity,
    innerWidth: Infinity,
    get scrollX() {
      return scrollPosition.x;
    },
    get scrollY() {
      return scrollPosition.y;
    },
    scrollBy,
  });
  return scrollBy;
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("createAutoScroller", () => {
  it("stops scheduling frames at the scroll boundary", () => {
    const scrollBy = stubWindow({ x: 0, y: 0 });
    const autoScroller = createAutoScroller(
      () => ({ x: AUTO_SCROLL_EDGE_THRESHOLD_PX, y: 0 }),
      () => true,
    );

    autoScroller.start();

    expect(scrollBy).toHaveBeenCalledWith({
      behavior: "instant",
      left: 0,
      top: -AUTO_SCROLL_SPEED_PX,
    });
    expect(nativeRequestAnimationFrame).not.toHaveBeenCalled();
    expect(autoScroller.isActive()).toBe(false);
  });

  it("keeps scheduling while the page scrolls", () => {
    stubWindow({ x: 0, y: AUTO_SCROLL_SPEED_PX * 2 });
    const onScrollStep = vi.fn();
    const autoScroller = createAutoScroller(
      () => ({ x: AUTO_SCROLL_EDGE_THRESHOLD_PX, y: 0 }),
      () => true,
      onScrollStep,
    );

    autoScroller.start();

    expect(onScrollStep).toHaveBeenCalledWith({ x: 0, y: -AUTO_SCROLL_SPEED_PX });
    expect(nativeRequestAnimationFrame).toHaveBeenCalledOnce();
    expect(autoScroller.isActive()).toBe(true);

    autoScroller.stop();
    expect(nativeCancelAnimationFrame).toHaveBeenCalledOnce();
  });
});
