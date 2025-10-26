import { Adapter, cursorAdapter } from "./adapters.js";
import {
  Hotkey,
  isKeyPressed,
  trackHotkeys,
  watchKeyHeldFor,
} from "./hotkeys.js";
import {
  filterStack,
  getHTMLSnippet,
  getStack,
  serializeStack,
} from "./instrumentation.js";
import {
  cleanupGrabbedIndicators,
  createGrabbedOverlay,
  createSelectionOverlay,
  hideLabel,
  hideProgressIndicator,
  showLabel,
  showProgressIndicator,
  updateLabelToProcessing,
} from "./overlay.js";
import { copyTextToClipboard } from "./utils/copy-text.js";
import { isElementVisible } from "./utils/is-element-visible.js";
import { ATTRIBUTE_NAME, mountRoot } from "./utils/mount-root.js";
import { createStore } from "./utils/store.js";

export { cursorAdapter } from "./adapters.js";
export type { Adapter } from "./adapters.js";

export interface Options {
  /**
   * adapter to open the prompt in an external tool
   */
  adapter?: Adapter;

  enabled?: boolean;

  /**
   * hotkey to trigger the overlay
   *
   * default: ["Meta", "C"] on macOS, ["Control", "C"] on Windows/Linux
   */
  hotkey?: Hotkey | Hotkey[];

  /**
   * time required (ms) to hold the key to trigger the overlay
   *
   * default: 500
   */
  keyHoldDuration?: number;
}

interface LibStore {
  keyPressTimestamps: Map<Hotkey, number>;
  mouseX: number;
  mouseY: number;
  overlayMode: "copying" | "hidden" | "visible";
  pressedKeys: Set<Hotkey>;
}

export const libStore = createStore<LibStore>(() => ({
  keyPressTimestamps: new Map(),
  mouseX: -1000,
  mouseY: -1000,
  overlayMode: "hidden",
  pressedKeys: new Set(),
}));

const getDefaultHotkey = (): Hotkey[] => {
  if (typeof navigator === "undefined") {
    return ["Meta", "C"];
  }

  const isMac = navigator.platform.toLowerCase().includes("mac");
  return isMac ? ["Meta", "C"] : ["Control", "C"];
};

export const init = (options: Options = {}) => {
  if (options.enabled === false) {
    return;
  }

  const resolvedOptions = {
    adapter: undefined,
    enabled: true,
    hotkey: options.hotkey ?? getDefaultHotkey(),
    keyHoldDuration: 500,
    ...options,
  };

  const root = mountRoot();
  const selectionOverlay = createSelectionOverlay(root);
  let hoveredElement: Element | null = null;
  let lastGrabbedElement: Element | null = null;
  let isCopying = false;
  let progressAnimationFrame: null | number = null;
  let progressStartTime: null | number = null;

  const checkIsActivationHotkeyPressed = () => {
    if (Array.isArray(resolvedOptions.hotkey)) {
      for (const key of resolvedOptions.hotkey) {
        if (!isKeyPressed(key)) {
          return false;
        }
      }
      return true;
    }
    return isKeyPressed(resolvedOptions.hotkey);
  };

  const updateProgressIndicator = () => {
    if (progressStartTime === null) return;

    const elapsed = Date.now() - progressStartTime;
    const progress = Math.min(1, elapsed / resolvedOptions.keyHoldDuration);
    const { mouseX, mouseY } = libStore.getState();
    showProgressIndicator(root, progress, mouseX, mouseY);

    if (progress < 1) {
      progressAnimationFrame = requestAnimationFrame(updateProgressIndicator);
    }
  };

  const startProgressTracking = () => {
    if (progressAnimationFrame !== null) return;

    progressStartTime = Date.now();
    const { mouseX, mouseY } = libStore.getState();
    showProgressIndicator(root, 0, mouseX, mouseY);
    progressAnimationFrame = requestAnimationFrame(updateProgressIndicator);
  };

  const stopProgressTracking = () => {
    if (progressAnimationFrame !== null) {
      cancelAnimationFrame(progressAnimationFrame);
      progressAnimationFrame = null;
    }
    progressStartTime = null;
    hideProgressIndicator();
  };

  let cleanupActivationHotkeyWatcher: (() => void) | null = null;

  const handleKeyStateChange = (pressedKeys: Set<Hotkey>) => {
    const { overlayMode } = libStore.getState();

    if (pressedKeys.has("Escape") || pressedKeys.has("Esc")) {
      libStore.setState((state) => {
        const nextPressedKeys = new Set(state.pressedKeys);
        nextPressedKeys.delete("Escape");
        nextPressedKeys.delete("Esc");
        const nextTimestamps = new Map(state.keyPressTimestamps);
        nextTimestamps.delete("Escape");
        nextTimestamps.delete("Esc");

        const activationKeys = Array.isArray(resolvedOptions.hotkey)
          ? resolvedOptions.hotkey
          : [resolvedOptions.hotkey];
        for (const activationKey of activationKeys) {
          if (activationKey.length === 1) {
            nextPressedKeys.delete(activationKey.toLowerCase());
            nextPressedKeys.delete(activationKey.toUpperCase());
            nextTimestamps.delete(activationKey.toLowerCase());
            nextTimestamps.delete(activationKey.toUpperCase());
          } else {
            nextPressedKeys.delete(activationKey);
            nextTimestamps.delete(activationKey);
          }
        }

        return {
          ...state,
          keyPressTimestamps: nextTimestamps,
          overlayMode: "hidden",
          pressedKeys: nextPressedKeys,
        };
      });
      if (cleanupActivationHotkeyWatcher) {
        cleanupActivationHotkeyWatcher();
        cleanupActivationHotkeyWatcher = null;
      }
      stopProgressTracking();
      return;
    }

    const isActivationHotkeyPressed = checkIsActivationHotkeyPressed();

    if (!isActivationHotkeyPressed) {
      if (cleanupActivationHotkeyWatcher) {
        cleanupActivationHotkeyWatcher();
        cleanupActivationHotkeyWatcher = null;
      }

      if (overlayMode !== "hidden") {
        libStore.setState((state) => ({
          ...state,
          overlayMode: "hidden",
        }));
      }

      stopProgressTracking();
      return;
    }

    if (overlayMode === "hidden" && !cleanupActivationHotkeyWatcher) {
      startProgressTracking();
      cleanupActivationHotkeyWatcher = watchKeyHeldFor(
        resolvedOptions.hotkey,
        resolvedOptions.keyHoldDuration,
        () => {
          libStore.setState((state) => ({
            ...state,
            overlayMode: "visible",
          }));
          stopProgressTracking();
          cleanupActivationHotkeyWatcher = null;
        },
      );
    }
  };

  const cleanupKeyStateChangeSubscription = libStore.subscribe(
    handleKeyStateChange,
    (state) => state.pressedKeys,
  );

  let mouseMoveScheduled = false;
  let pendingMouseX = -1000;
  let pendingMouseY = -1000;

  const handleMouseMove = (event: MouseEvent) => {
    pendingMouseX = event.clientX;
    pendingMouseY = event.clientY;

    if (mouseMoveScheduled) return;
    mouseMoveScheduled = true;

    requestAnimationFrame(() => {
      mouseMoveScheduled = false;
      libStore.setState((state) => ({
        ...state,
        mouseX: pendingMouseX,
        mouseY: pendingMouseY,
      }));
    });
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    const { overlayMode } = libStore.getState();

    if (overlayMode === "hidden") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    libStore.setState((state) => ({
      ...state,
      overlayMode: "copying",
    }));
  };

  const handleClick = (event: MouseEvent) => {
    const { overlayMode } = libStore.getState();

    if (overlayMode === "hidden") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      cleanupGrabbedIndicators();
      hideLabel();
    }
  };

  let scrollScheduled = false;
  const handleScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      scheduleRender();
    });
  };

  let resizeScheduled = false;
  const handleResize = () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      scheduleRender();
    });
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mousedown", handleMouseDown, true);
  window.addEventListener("click", handleClick, true);
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  const cleanupTrackHotkeys = trackHotkeys();

  const getElementAtPosition = (x: number, y: number): Element | null => {
    const elements = document.elementsFromPoint(x, y);

    for (const element of elements) {
      if (element.closest(`[${ATTRIBUTE_NAME}]`)) {
        continue;
      }

      const computedStyle = window.getComputedStyle(element);
      if (!isElementVisible(element, computedStyle)) {
        continue;
      }

      return element;
    }

    return null;
  };

  const handleCopy = async (element: Element) => {
    const tagName = (element.tagName || "").toLowerCase();
    const rect = element.getBoundingClientRect();
    const cleanupIndicator = updateLabelToProcessing(root, rect.left, rect.top);

    try {
      const htmlSnippet = getHTMLSnippet(element);

      await copyTextToClipboard(
        `\n\n<referenced_element>\n${htmlSnippet}\n</referenced_element>`,
      );

      const stack = await getStack(element);

      if (stack) {
        const filteredStack = filterStack(stack);

        if (filteredStack.length > 0) {
          const serializedStack = serializeStack(filteredStack);
          const fullText = `${htmlSnippet}\n\nComponent owner stack:\n${serializedStack}`;

          await copyTextToClipboard(
            `\n\n<referenced_element>\n${fullText}\n</referenced_element>`,
          ).catch(() => {});

          if (resolvedOptions.adapter) {
            resolvedOptions.adapter.open(fullText);
          }
        } else if (resolvedOptions.adapter) {
          resolvedOptions.adapter.open(htmlSnippet);
        }
      } else if (resolvedOptions.adapter) {
        resolvedOptions.adapter.open(htmlSnippet);
      }

      cleanupIndicator(tagName);
    } catch {
      cleanupIndicator(tagName);
    }
  };

  const handleRender = (state: LibStore) => {
    const { mouseX, mouseY, overlayMode } = state;

    if (overlayMode === "hidden") {
      if (selectionOverlay.isVisible()) {
        selectionOverlay.hide();
      }
      if (!isCopying) {
        hideLabel();
      }
      hoveredElement = null;
      lastGrabbedElement = null;
      return;
    }

    if (overlayMode === "copying" && hoveredElement) {
      if (!isCopying) {
        isCopying = true;
        lastGrabbedElement = hoveredElement;
        const computedStyle = window.getComputedStyle(hoveredElement);
        const rect = hoveredElement.getBoundingClientRect();

        createGrabbedOverlay(root, {
          borderRadius: computedStyle.borderRadius || "0px",
          height: rect.height,
          transform: computedStyle.transform || "none",
          width: rect.width,
          x: rect.left,
          y: rect.top,
        });

        void handleCopy(hoveredElement).finally(() => {
          isCopying = false;
        });

        const isStillPressed = checkIsActivationHotkeyPressed();
        libStore.setState((state) => ({
          ...state,
          overlayMode: isStillPressed ? "visible" : "hidden",
        }));
      }
      return;
    }

    const element = getElementAtPosition(mouseX, mouseY);

    if (!element) {
      if (selectionOverlay.isVisible()) {
        selectionOverlay.hide();
      }
      if (!isCopying) {
        hideLabel();
      }
      hoveredElement = null;
      return;
    }

    if (lastGrabbedElement && element !== lastGrabbedElement) {
      lastGrabbedElement = null;
    }

    if (element === lastGrabbedElement) {
      if (selectionOverlay.isVisible()) {
        selectionOverlay.hide();
      }
      if (!isCopying) {
        hideLabel();
      }
      hoveredElement = element;
      return;
    }

    const tagName = (element.tagName || "").toLowerCase();
    hoveredElement = element;
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const borderRadius = computedStyle.borderRadius || "0px";
    const transform = computedStyle.transform || "none";

    selectionOverlay.update({
      borderRadius,
      height: rect.height,
      transform,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    });

    if (!selectionOverlay.isVisible()) {
      selectionOverlay.show();
    }

    showLabel(root, rect.left, rect.top, tagName);

    const isDisabled =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- we do any because typing this will be a massive fucking headache
      Boolean((element as any).disabled) ||
      computedStyle.pointerEvents === "none";

    if (isDisabled) {
      const overlayElement = selectionOverlay.element;
      if (overlayElement) {
        overlayElement.style.pointerEvents = "auto";
      }
    }
  };

  let renderScheduled = false;

  const scheduleRender = () => {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      handleRender(libStore.getState());
    });
  };

  const cleanupRenderSubscription = libStore.subscribe(() => {
    scheduleRender();
  });

  const continuousRender = () => {
    scheduleRender();
    requestAnimationFrame(continuousRender);
  };

  continuousRender();

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mousedown", handleMouseDown, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    cleanupTrackHotkeys();
    cleanupRenderSubscription();
    cleanupKeyStateChangeSubscription();
    if (cleanupActivationHotkeyWatcher) {
      cleanupActivationHotkeyWatcher();
    }
    stopProgressTracking();
    cleanupGrabbedIndicators();
    hideLabel();
  };
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const currentScript = document.currentScript;
  const options: Options = {};
  if (currentScript?.dataset) {
    const { adapter, enabled, hotkey, keyHoldDuration } = currentScript.dataset;

    if (adapter !== undefined) {
      if (adapter === "cursor") {
        options.adapter = cursorAdapter;
      }
    }

    if (enabled !== undefined) {
      options.enabled = enabled === "true";
    }

    if (hotkey !== undefined) {
      const keys = hotkey.split(",").map((key) => key.trim());
      options.hotkey = keys.length === 1 ? keys[0] : keys;
    }

    if (keyHoldDuration !== undefined) {
      const duration = Number(keyHoldDuration);
      if (!Number.isNaN(duration)) {
        options.keyHoldDuration = duration;
      }
    }
  }
  init(options);
}
