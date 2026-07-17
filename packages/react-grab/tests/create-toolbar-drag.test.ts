import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createToolbarDrag } from "../src/utils/create-toolbar-drag.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../src/utils/native-raf.js";

vi.mock("../src/utils/native-raf.js", () => ({
  nativeCancelAnimationFrame: vi.fn(),
  nativeRequestAnimationFrame: vi.fn(),
}));

describe("createToolbarDrag", () => {
  const pendingAnimationFrames = new Map<number, FrameRequestCallback>();
  const windowListeners = new Map<string, (event: PointerEvent) => void>();
  let nextAnimationFrameId = 1;

  beforeEach(() => {
    nextAnimationFrameId = 1;
    pendingAnimationFrames.clear();
    windowListeners.clear();
    vi.mocked(nativeRequestAnimationFrame).mockImplementation((callback) => {
      const animationFrameId = nextAnimationFrameId++;
      pendingAnimationFrames.set(animationFrameId, callback);
      return animationFrameId;
    });
    vi.mocked(nativeCancelAnimationFrame).mockImplementation((animationFrameId) => {
      pendingAnimationFrames.delete(animationFrameId);
    });
    vi.stubGlobal("window", {
      addEventListener: (eventName: string, listener: (event: PointerEvent) => void): void => {
        windowListeners.set(eventName, listener);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cancels disposed snap frames and ignores pointerdown while snapping", () => {
    const containerRef: HTMLDivElement = Object.create({
      getBoundingClientRect: () => ({
        left: 10,
        top: 10,
        width: 100,
        height: 40,
      }),
    });
    const onSnapComplete = vi.fn();
    const ownedDrag = createRoot((disposeOwner) => ({
      disposeOwner,
      drag: createToolbarDrag({
        getContainerRef: () => containerRef,
        isCollapsed: () => false,
        getExpandedDimensions: () => ({ width: 100, height: 40 }),
        onDragStart: () => {},
        onPositionUpdate: () => {},
        onSnapEdgeChange: () => {},
        onSnapComplete,
      }),
    }));

    const pointerDownEvent: PointerEvent = Object.create({
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    const pointerMoveEvent: PointerEvent = Object.create({
      clientX: 30,
      clientY: 30,
    });
    const performDrag = () => {
      ownedDrag.drag.handlePointerDown(pointerDownEvent);
      windowListeners.get("pointermove")?.(pointerMoveEvent);
      windowListeners.get("pointerup")?.(pointerMoveEvent);
    };

    performDrag();
    expect(pendingAnimationFrames.has(1)).toBe(true);
    expect(ownedDrag.drag.isSnapping()).toBe(true);

    ownedDrag.drag.handlePointerDown(pointerDownEvent);
    expect(ownedDrag.drag.isDragging()).toBe(false);

    const firstFrame = pendingAnimationFrames.get(1);
    pendingAnimationFrames.delete(1);
    firstFrame?.(0);
    expect(pendingAnimationFrames.has(2)).toBe(true);

    ownedDrag.disposeOwner();

    expect(nativeCancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(pendingAnimationFrames.size).toBe(0);
    expect(onSnapComplete).not.toHaveBeenCalled();
  });
});
