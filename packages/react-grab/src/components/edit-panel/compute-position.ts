import { ARROW_HEIGHT_PX, DROPDOWN_OFFSCREEN_POSITION, LABEL_GAP_PX } from "../../constants.js";
import type { EditPanelState, OverlayBounds } from "../../types.js";

export interface EditPanelPosition {
  left: number;
  top: number;
  arrowLeft: number;
  arrowPosition: "top" | "bottom";
}

export const OFFSCREEN_POSITION: EditPanelPosition = {
  left: DROPDOWN_OFFSCREEN_POSITION.left,
  top: DROPDOWN_OFFSCREEN_POSITION.top,
  arrowLeft: 0,
  arrowPosition: "bottom",
};

interface ComputePanelPositionInput {
  state: EditPanelState;
  bounds: OverlayBounds;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

// Anchors the panel to the cursor X as a RATIO of the element's bounds,
// not a fixed screen pixel — so as the element resizes (e.g. a padding
// tweak grows it asymmetrically) the panel + arrow track the same
// relative point on the element instead of drifting off-center.
export const computeEditPanelPosition = ({
  state,
  bounds,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
}: ComputePanelPositionInput): EditPanelPosition => {
  if (panelWidth === 0 || panelHeight === 0) return OFFSCREEN_POSITION;

  const originalBounds = state.selectionBounds;
  const cursorRatio =
    originalBounds.width > 0 ? (state.position.x - originalBounds.x) / originalBounds.width : 0.5;
  const cursorX = bounds.x + bounds.width * cursorRatio;

  const left = Math.max(
    LABEL_GAP_PX,
    Math.min(cursorX - panelWidth / 2, viewportWidth - panelWidth - LABEL_GAP_PX),
  );
  const arrowLeft = Math.max(
    ARROW_HEIGHT_PX,
    Math.min(cursorX - left, panelWidth - ARROW_HEIGHT_PX),
  );

  const positionBelow = bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
  const positionAbove = bounds.y - panelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
  const overflowsBottom = positionBelow + panelHeight > viewportHeight;
  const shouldFlipAbove = overflowsBottom && positionAbove >= 0;

  return {
    left,
    top: shouldFlipAbove ? positionAbove : positionBelow,
    arrowLeft,
    arrowPosition: shouldFlipAbove ? "top" : "bottom",
  };
};
