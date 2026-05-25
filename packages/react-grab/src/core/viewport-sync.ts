import { type Accessor, createEffect, onCleanup } from "solid-js";
import { BOUNDS_RECALC_INTERVAL_MS, ZOOM_DETECTION_THRESHOLD } from "../constants.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { invalidateInteractionCaches } from "../utils/invalidate-interaction-caches.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";
import type { createGrabStore } from "./store.js";
import type { GrabPhaseSelectors } from "./selectors.js";
import type { createEventListenerManager } from "./events.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type EventListenerManagerHandle = ReturnType<typeof createEventListenerManager>;

interface ViewportSyncInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  /** Whether the toolbar/runtime is currently enabled by the user. */
  isEnabled: Accessor<boolean>;
  /** Whether overlay theming is enabled (gates the bounds-recalc interval). */
  isThemeEnabled: Accessor<boolean>;
  eventListenerManager: EventListenerManagerHandle;
}

export interface ViewportSyncObserver {
  /**
   * Re-run hover detection at the current pointer location. Useful when a
   * non-pointer event (scroll, resize, viewport change) shifts what's under
   * the cursor.
   */
  redetectElementUnderPointer: () => void;
  /** Run a full viewport-change pass (cache invalidation + redetect + version bump). */
  handleViewportChange: () => void;
}

/**
 * Watches the document for scroll/resize/visualViewport changes and keeps the
 * overlay's idea of "what's under the pointer" and "where are the bounds" in
 * sync with the page. Also runs a coarse interval-driven rAF re-sync while
 * the overlay is showing so animations and ResizeObserver-free changes keep
 * the selection box pinned.
 */
export const createViewportSyncObserver = (input: ViewportSyncInput): ViewportSyncObserver => {
  const { grab, phase, isEnabled, isThemeEnabled, eventListenerManager } = input;
  const { store, actions, pointer } = grab;
  const {
    isHoldingKeys,
    isActivated,
    isPromptMode,
    isSelectionInteractionLocked,
    isFrozenPhase,
    isDragging,
    isCopying,
  } = phase;

  let boundsRecalcIntervalId: number | null = null;
  let viewportChangeFrameId: number | null = null;
  let previousViewportWidth = window.innerWidth;
  let previousViewportHeight = window.innerHeight;

  const redetectElementUnderPointer = () => {
    if (store.isTouchMode && !isHoldingKeys() && !isActivated()) return;
    if (
      isEnabled() &&
      !isPromptMode() &&
      !isSelectionInteractionLocked() &&
      !isFrozenPhase() &&
      !isDragging() &&
      store.contextMenuPosition === null &&
      store.frozenElements.length === 0
    ) {
      const candidate = getElementAtPosition(pointer().x, pointer().y);
      actions.setDetectedElement(candidate);
    }
  };

  const handleViewportChange = () => {
    invalidateInteractionCaches();
    redetectElementUnderPointer();
    actions.incrementViewportVersion();
    actions.updateContextMenuPosition();
  };

  const scheduleBoundsSync = () => {
    if (viewportChangeFrameId !== null) return;
    viewportChangeFrameId = nativeRequestAnimationFrame(() => {
      viewportChangeFrameId = null;
      actions.incrementViewportVersion();
    });
  };

  eventListenerManager.addWindowListener("scroll", handleViewportChange, {
    capture: true,
  });

  eventListenerManager.addWindowListener("resize", () => {
    const currentViewportWidth = window.innerWidth;
    const currentViewportHeight = window.innerHeight;

    if (previousViewportWidth > 0 && previousViewportHeight > 0) {
      const scaleX = currentViewportWidth / previousViewportWidth;
      const scaleY = currentViewportHeight / previousViewportHeight;
      const isUniformScale = Math.abs(scaleX - scaleY) < ZOOM_DETECTION_THRESHOLD;
      const hasScaleChanged = Math.abs(scaleX - 1) > ZOOM_DETECTION_THRESHOLD;

      if (isUniformScale && hasScaleChanged) {
        actions.setPointer({
          x: pointer().x * scaleX,
          y: pointer().y * scaleY,
        });
      }
    }

    previousViewportWidth = currentViewportWidth;
    previousViewportHeight = currentViewportHeight;

    handleViewportChange();
  });

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    const { signal } = eventListenerManager;
    visualViewport.addEventListener("resize", handleViewportChange, { signal });
    visualViewport.addEventListener("scroll", handleViewportChange, { signal });
  }

  // Only run the coarse bounds-recalc interval while the overlay is actually
  // showing something. Otherwise we burn CPU re-incrementing viewportVersion
  // every 100ms for no observable change.
  createEffect(() => {
    const shouldRunInterval =
      isThemeEnabled() &&
      (isActivated() ||
        isCopying() ||
        store.labelInstances.length > 0 ||
        store.grabbedBoxes.length > 0);

    if (shouldRunInterval) {
      if (boundsRecalcIntervalId !== null) return;
      boundsRecalcIntervalId = window.setInterval(() => {
        scheduleBoundsSync();
      }, BOUNDS_RECALC_INTERVAL_MS);
      return;
    }

    if (boundsRecalcIntervalId !== null) {
      window.clearInterval(boundsRecalcIntervalId);
      boundsRecalcIntervalId = null;
    }
    if (viewportChangeFrameId !== null) {
      nativeCancelAnimationFrame(viewportChangeFrameId);
      viewportChangeFrameId = null;
    }
  });

  onCleanup(() => {
    if (boundsRecalcIntervalId !== null) {
      window.clearInterval(boundsRecalcIntervalId);
    }
    if (viewportChangeFrameId !== null) {
      nativeCancelAnimationFrame(viewportChangeFrameId);
    }
  });

  return { redetectElementUnderPointer, handleViewportChange };
};
