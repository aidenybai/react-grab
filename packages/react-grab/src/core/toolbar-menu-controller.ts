import { type Accessor, createSignal } from "solid-js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";
import { getNearestEdge } from "../utils/get-nearest-edge.js";
import type { DropdownAnchor } from "../types.js";

interface ToolbarMenuControllerInput {
  /**
   * Late-bound reference to the toolbar host element. The controller polls
   * this each frame while the menu is open so the dropdown can re-anchor
   * if the toolbar moves (drag, snap, resize) without us needing to
   * re-wire reactivity.
   */
  getToolbarElement: () => HTMLElement | undefined;
}

export interface ToolbarMenuController {
  /** Reactive position of the toolbar dropdown menu, null when closed. */
  position: Accessor<DropdownAnchor | null>;
  /** Open the menu, anchored to the current toolbar position. */
  open: () => void;
  /** Close the menu and stop tracking the toolbar position. */
  dismiss: () => void;
  /** Toggle open/closed. Use when the same input toggles the menu. */
  toggle: () => void;
  /** Stop the tracking rAF; call from disposal paths. */
  dispose: () => void;
}

const computeDropdownAnchor = (toolbarElement: HTMLElement): DropdownAnchor => {
  const toolbarRect = toolbarElement.getBoundingClientRect();
  const edge = getNearestEdge(toolbarRect);

  if (edge === "left" || edge === "right") {
    return {
      x: edge === "left" ? toolbarRect.right : toolbarRect.left,
      y: toolbarRect.top + toolbarRect.height / 2,
      edge,
      toolbarWidth: toolbarRect.width,
    };
  }

  return {
    x: toolbarRect.left + toolbarRect.width / 2,
    y: edge === "top" ? toolbarRect.bottom : toolbarRect.top,
    edge,
    toolbarWidth: toolbarRect.width,
  };
};

export const createToolbarMenuController = (
  input: ToolbarMenuControllerInput,
): ToolbarMenuController => {
  const [position, setPosition] = createSignal<DropdownAnchor | null>(null);
  let trackingFrameId: number | null = null;

  const stopTracking = () => {
    if (trackingFrameId !== null) {
      nativeCancelAnimationFrame(trackingFrameId);
      trackingFrameId = null;
    }
  };

  const tick = () => {
    const toolbar = input.getToolbarElement();
    if (toolbar) setPosition(computeDropdownAnchor(toolbar));
    trackingFrameId = nativeRequestAnimationFrame(tick);
  };

  const open = () => {
    stopTracking();
    tick();
  };

  const dismiss = () => {
    stopTracking();
    setPosition(null);
  };

  const toggle = () => {
    if (position() !== null) {
      dismiss();
    } else {
      open();
    }
  };

  const dispose = () => {
    stopTracking();
  };

  return { position, open, dismiss, toggle, dispose };
};
