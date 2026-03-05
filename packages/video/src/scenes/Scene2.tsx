import type React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  BACKGROUND_COLOR,
  S2_CURSOR_APPEAR,
  S2_CURSOR_ARRIVE,
  S2_SELECTION_SHOW,
  S2_LABEL_SHOW,
  S2_COPYING_START,
  S2_COPIED_START,
  S2_FADE_OUT,
  S2_FADE_DURATION,
  TOOLBAR_X,
  TOOLBAR_Y,
} from "../constants";
import { Dashboard, METRIC_CARD_REVENUE } from "../components/Dashboard";
import { ToolbarContent } from "../components/ToolbarContent";
import { Cursor } from "../components/Cursor";
import { SelectionBox } from "../components/SelectionBox";
import { SuccessFlash } from "../components/SuccessFlash";
import { SelectionLabel } from "../components/selection-label/SelectionLabel";
import type { SelectionLabelStatus } from "../components/selection-label/SelectionLabel";
import { createCursorTimeline } from "../utils/createCursorTimeline";
import { geistFontFamily } from "../utils/fonts";

const revenueCenter = {
  x: METRIC_CARD_REVENUE.x + METRIC_CARD_REVENUE.width / 2,
  y: METRIC_CARD_REVENUE.y + METRIC_CARD_REVENUE.height / 2,
};

const getCursorPosition = createCursorTimeline([
  { frame: 0, x: 960, y: 540 },
  { frame: S2_CURSOR_ARRIVE, x: revenueCenter.x, y: revenueCenter.y },
  { frame: S2_FADE_OUT + S2_FADE_DURATION, x: revenueCenter.x, y: revenueCenter.y },
]);

const getCursorOpacity = (frame: number): number => {
  const fadeIn = interpolate(frame, [S2_CURSOR_APPEAR, S2_CURSOR_APPEAR + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [S2_FADE_OUT, S2_FADE_OUT + S2_FADE_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
};

const getLabelStatus = (frame: number): SelectionLabelStatus => {
  if (frame < S2_COPYING_START) return "idle";
  if (frame < S2_COPIED_START) return "copying";
  return "copied";
};

const getLabelOpacity = (frame: number): number => {
  const fadeIn = interpolate(frame, [S2_LABEL_SHOW, S2_LABEL_SHOW + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [S2_FADE_OUT, S2_FADE_OUT + S2_FADE_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
};

/**
 * Scene 2 — Select & Copy (frames 0-160 relative, 80-240 absolute)
 * Cursor appears as crosshair, moves to Revenue card.
 * SelectionBox + SelectionLabel appear.
 * Label hard-cuts: idle -> Grabbing... (spinner + shimmer) -> Copied (checkmark).
 * Everything fades out over ~5 frames.
 */
export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();

  const cursorPos = getCursorPosition(frame);
  const cursorOpacity = getCursorOpacity(frame);
  const labelStatus = getLabelStatus(frame);
  const labelOpacity = getLabelOpacity(frame);

  const labelStatusText = labelStatus === "copying" ? "Grabbing\u2026" : "Copied";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      <Dashboard />

      {/* Toolbar (persistent from Scene 1, fully visible) */}
      <div
        style={{
          position: "absolute",
          left: TOOLBAR_X,
          top: TOOLBAR_Y,
          transform: "translateX(-50%)",
          zIndex: 100,
        }}
      >
        <ToolbarContent isActive enabled isCollapsed={false} showHistoryBadge={false} />
      </div>

      {/* SelectionBox on Revenue card */}
      <SelectionBox
        x={METRIC_CARD_REVENUE.x}
        y={METRIC_CARD_REVENUE.y}
        width={METRIC_CARD_REVENUE.width}
        height={METRIC_CARD_REVENUE.height}
        showAt={S2_SELECTION_SHOW}
        hideAt={S2_FADE_OUT}
      />

      {/* Success flash on copy confirmation */}
      <SuccessFlash
        x={METRIC_CARD_REVENUE.x}
        y={METRIC_CARD_REVENUE.y}
        width={METRIC_CARD_REVENUE.width}
        height={METRIC_CARD_REVENUE.height}
        triggerAt={S2_COPIED_START}
        duration={12}
      />

      {/* SelectionLabel below Revenue card */}
      {labelOpacity > 0 && (
        <SelectionLabel
          x={METRIC_CARD_REVENUE.x + METRIC_CARD_REVENUE.width / 2}
          y={METRIC_CARD_REVENUE.y + METRIC_CARD_REVENUE.height + 10}
          tagName="div"
          componentName="MetricCard"
          status={labelStatus}
          statusText={labelStatusText}
          shimmerStartFrame={S2_COPYING_START}
          opacity={labelOpacity}
        />
      )}

      {/* Crosshair cursor */}
      <Cursor
        x={cursorPos.x}
        y={cursorPos.y}
        type="crosshair"
        opacity={cursorOpacity}
      />
    </AbsoluteFill>
  );
};
