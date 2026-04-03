import type { Position } from "../types.js";
import type { SnapEdge } from "../components/toolbar/state.js";
import {
  TOOLBAR_SNAP_MARGIN_PX,
  TOOLBAR_VELOCITY_MULTIPLIER_MS,
  TOOLBAR_DEFAULT_POSITION_RATIO,
} from "../constants.js";
import { getVisualViewport } from "./get-visual-viewport.js";

export const clampToRange = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export const getPositionFromEdgeAndRatio = (
  edge: SnapEdge,
  ratio: number,
  elementWidth: number,
  elementHeight: number,
): Position => {
  const viewport = getVisualViewport();
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;

  const minX = viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX;
  const maxX = Math.max(
    minX,
    viewport.offsetLeft + viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
  );
  const minY = viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX;
  const maxY = Math.max(
    minY,
    viewport.offsetTop + viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
  );

  if (edge === "top" || edge === "bottom") {
    const availableWidth = Math.max(0, viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2);
    const positionX = Math.min(
      maxX,
      Math.max(minX, viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX + availableWidth * ratio),
    );
    const positionY = edge === "top" ? minY : maxY;
    return { x: positionX, y: positionY };
  }

  const availableHeight = Math.max(0, viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX * 2);
  const positionY = Math.min(
    maxY,
    Math.max(minY, viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX + availableHeight * ratio),
  );
  const positionX = edge === "left" ? minX : maxX;
  return { x: positionX, y: positionY };
};

export const getRatioFromPosition = (
  edge: SnapEdge,
  positionX: number,
  positionY: number,
  elementWidth: number,
  elementHeight: number,
): number => {
  const viewport = getVisualViewport();
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;

  if (edge === "top" || edge === "bottom") {
    const availableWidth = viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2;
    if (availableWidth <= 0) return TOOLBAR_DEFAULT_POSITION_RATIO;
    return Math.max(
      0,
      Math.min(1, (positionX - viewport.offsetLeft - TOOLBAR_SNAP_MARGIN_PX) / availableWidth),
    );
  }
  const availableHeight = viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX * 2;
  if (availableHeight <= 0) return TOOLBAR_DEFAULT_POSITION_RATIO;
  return Math.max(
    0,
    Math.min(1, (positionY - viewport.offsetTop - TOOLBAR_SNAP_MARGIN_PX) / availableHeight),
  );
};

interface Dimensions {
  width: number;
  height: number;
}

export const calculateExpandedPositionFromCollapsed = (
  collapsedPosition: Position,
  edge: SnapEdge,
  expandedDimensions: Dimensions,
  actualCollapsedWidth: number,
  actualCollapsedHeight: number,
): { position: Position; ratio: number } => {
  const viewport = getVisualViewport();
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const { width: expandedWidth, height: expandedHeight } = expandedDimensions;

  let newPosition: Position;

  if (edge === "top" || edge === "bottom") {
    const xOffset = (expandedWidth - actualCollapsedWidth) / 2;
    const newExpandedX = collapsedPosition.x - xOffset;
    const clampedX = clampToRange(
      newExpandedX,
      viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
      viewport.offsetLeft + viewportWidth - expandedWidth - TOOLBAR_SNAP_MARGIN_PX,
    );
    const newExpandedY =
      edge === "top"
        ? viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX
        : viewport.offsetTop + viewportHeight - expandedHeight - TOOLBAR_SNAP_MARGIN_PX;
    newPosition = { x: clampedX, y: newExpandedY };
  } else {
    const yOffset = (expandedHeight - actualCollapsedHeight) / 2;
    const newExpandedY = collapsedPosition.y - yOffset;
    const clampedY = clampToRange(
      newExpandedY,
      viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
      viewport.offsetTop + viewportHeight - expandedHeight - TOOLBAR_SNAP_MARGIN_PX,
    );
    const newExpandedX =
      edge === "left"
        ? viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX
        : viewport.offsetLeft + viewportWidth - expandedWidth - TOOLBAR_SNAP_MARGIN_PX;
    newPosition = { x: newExpandedX, y: clampedY };
  }

  const ratio = getRatioFromPosition(
    edge,
    newPosition.x,
    newPosition.y,
    expandedWidth,
    expandedHeight,
  );

  return { position: newPosition, ratio };
};

export const getCollapsedPosition = (
  edge: SnapEdge,
  expandedPosition: Position,
  expandedDimensions: Dimensions,
  collapsedDimensions: Dimensions,
): Position => {
  const viewport = getVisualViewport();
  const { width: expandedWidth, height: expandedHeight } = expandedDimensions;
  const { width: collapsedWidth, height: collapsedHeight } = collapsedDimensions;

  switch (edge) {
    case "top":
    case "bottom": {
      const xOffset = (expandedWidth - collapsedWidth) / 2;
      const centeredX = expandedPosition.x + xOffset;
      const clampedX = clampToRange(
        centeredX,
        viewport.offsetLeft,
        viewport.offsetLeft + viewport.width - collapsedWidth,
      );
      return {
        x: clampedX,
        y:
          edge === "top"
            ? viewport.offsetTop
            : viewport.offsetTop + viewport.height - collapsedHeight,
      };
    }
    case "left":
    case "right": {
      const yOffset = (expandedHeight - collapsedHeight) / 2;
      const centeredY = expandedPosition.y + yOffset;
      const clampedY = clampToRange(
        centeredY,
        viewport.offsetTop,
        viewport.offsetTop + viewport.height - collapsedHeight,
      );
      return {
        x:
          edge === "left"
            ? viewport.offsetLeft
            : viewport.offsetLeft + viewport.width - collapsedWidth,
        y: clampedY,
      };
    }
  }
};

interface SnapResult extends Position {
  edge: SnapEdge;
}

export const getSnapPosition = (
  currentX: number,
  currentY: number,
  elementWidth: number,
  elementHeight: number,
  velocityX: number,
  velocityY: number,
): SnapResult => {
  const viewport = getVisualViewport();
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;

  const projectedX = currentX + velocityX * TOOLBAR_VELOCITY_MULTIPLIER_MS;
  const projectedY = currentY + velocityY * TOOLBAR_VELOCITY_MULTIPLIER_MS;

  const distanceToTop = projectedY - viewport.offsetTop + elementHeight / 2;
  const distanceToBottom = viewport.offsetTop + viewportHeight - projectedY - elementHeight / 2;
  const distanceToLeft = projectedX - viewport.offsetLeft + elementWidth / 2;
  const distanceToRight = viewport.offsetLeft + viewportWidth - projectedX - elementWidth / 2;

  const minDistance = Math.min(distanceToTop, distanceToBottom, distanceToLeft, distanceToRight);

  const clampX = (rawX: number) =>
    clampToRange(
      rawX,
      viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
      viewport.offsetLeft + viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
    );
  const clampY = (rawY: number) =>
    clampToRange(
      rawY,
      viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
      viewport.offsetTop + viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
    );

  if (minDistance === distanceToTop) {
    return {
      edge: "top",
      x: clampX(projectedX),
      y: viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
    };
  }
  if (minDistance === distanceToLeft) {
    return {
      edge: "left",
      x: viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
      y: clampY(projectedY),
    };
  }
  if (minDistance === distanceToRight) {
    return {
      edge: "right",
      x: viewport.offsetLeft + viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
      y: clampY(projectedY),
    };
  }
  return {
    edge: "bottom",
    x: clampX(projectedX),
    y: viewport.offsetTop + viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
  };
};
