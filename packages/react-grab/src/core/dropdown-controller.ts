import type { ToolbarState, DropdownAnchor } from "../types.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";

export interface DropdownController {
  startTracking: (computePosition: () => void) => void;
  stopTracking: () => void;
  computeAnchor: () => DropdownAnchor | null;
  dispose: () => void;
}

const getNearestEdge = (rect: DOMRect): ToolbarState["edge"] => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distanceToTop = centerY;
  const distanceToBottom = window.innerHeight - centerY;
  const distanceToLeft = centerX;
  const distanceToRight = window.innerWidth - centerX;
  const minimumDistance = Math.min(
    distanceToTop,
    distanceToBottom,
    distanceToLeft,
    distanceToRight,
  );
  if (minimumDistance === distanceToTop) return "top";
  if (minimumDistance === distanceToLeft) return "left";
  if (minimumDistance === distanceToRight) return "right";
  return "bottom";
};

export const createDropdownController = (
  getToolbarElement: () => HTMLDivElement | undefined,
): DropdownController => {
  let trackingFrameId: number | null = null;

  const stopTracking = () => {
    if (trackingFrameId !== null) {
      nativeCancelAnimationFrame(trackingFrameId);
      trackingFrameId = null;
    }
  };

  const startTracking = (computePosition: () => void) => {
    stopTracking();
    const updatePosition = () => {
      computePosition();
      trackingFrameId = nativeRequestAnimationFrame(updatePosition);
    };
    updatePosition();
  };

  const computeAnchor = (): DropdownAnchor | null => {
    const toolbarElement = getToolbarElement();
    if (!toolbarElement) return null;
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

  const dispose = () => {
    stopTracking();
  };

  return {
    startTracking,
    stopTracking,
    computeAnchor,
    dispose,
  };
};
