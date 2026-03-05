import type React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BACKGROUND_COLOR } from "./constants";
import { Cursor } from "./components/Cursor";
import type { CursorType } from "./components/Cursor";
import { SelectionBox } from "./components/SelectionBox";
import { SuccessFlash } from "./components/SuccessFlash";
import { SelectionLabel } from "./components/selection-label/SelectionLabel";
import type { SelectionLabelStatus } from "./components/selection-label/SelectionLabel";
import { createCursorTimeline } from "./utils/createCursorTimeline";
import { geistFontFamily } from "./utils/fonts";

// Demo cursor timeline — pure function of frame
const getCursorPosition = createCursorTimeline([
  { frame: 0, x: 960, y: 540 },
  { frame: 40, x: 400, y: 300 },
  { frame: 120, x: 800, y: 400 },
  { frame: 200, x: 1200, y: 600 },
  { frame: 300, x: 960, y: 540 },
]);

// Cursor type — pure function of frame, no useState
const getCursorType = (frame: number): CursorType => {
  if (frame < 40) return "default";
  if (frame < 120) return "crosshair";
  if (frame < 200) return "grabbing";
  return "default";
};

// Cursor visibility — pure function of frame
const isCursorVisible = (frame: number): boolean => {
  return frame >= 0;
};

// Label status — pure function of frame, no useState
const getLabelStatus = (frame: number): SelectionLabelStatus => {
  if (frame < 40) return "idle";
  if (frame < 80) return "idle";
  if (frame < 120) return "copying";
  if (frame < 160) return "copied";
  return "idle";
};

// Label visibility — pure function of frame
const isLabelVisible = (frame: number): boolean => {
  return frame >= 40 && frame < 200;
};

// Label opacity — pure function of frame via interpolate()
const getLabelOpacity = (frame: number): number => {
  if (frame < 40) return 0;
  const fadeIn = interpolate(frame, [40, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [195, 200], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
};

export const MainComposition: React.FC = () => {
  const frame = useCurrentFrame();

  // All state derived from useCurrentFrame() — no useState
  const cursorPos = getCursorPosition(frame);
  const cursorType = getCursorType(frame);
  const cursorVisible = isCursorVisible(frame);
  const labelStatus = getLabelStatus(frame);
  const labelVisible = isLabelVisible(frame);
  const labelOpacity = getLabelOpacity(frame);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      {/* Selection box — visibility driven by frame via interpolate() */}
      <SelectionBox
        x={350}
        y={250}
        width={200}
        height={100}
        showAt={40}
        hideAt={120}
      />

      {/* Success flash — pulse driven by frame via interpolate() */}
      <SuccessFlash
        x={350}
        y={250}
        width={200}
        height={100}
        triggerAt={100}
        duration={12}
      />

      {/* Label — status, visibility, opacity all pure functions of frame */}
      {labelVisible && (
        <SelectionLabel
          x={450}
          y={360}
          tagName="div"
          componentName="MetricCard"
          status={labelStatus}
          statusText={labelStatus === "copying" ? "Grabbing\u2026" : "Copied"}
          shimmerStartFrame={80}
          opacity={labelOpacity}
        />
      )}

      {/* Cursor — position, type, visibility all pure functions of frame */}
      <Cursor
        x={cursorPos.x}
        y={cursorPos.y}
        type={cursorType}
        visible={cursorVisible}
      />
    </AbsoluteFill>
  );
};
