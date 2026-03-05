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

// --- All state below is a pure function of frame, no useState anywhere ---

// Cursor position — interpolated via createCursorTimeline with Easing.inOut(Easing.cubic)
const getCursorPosition = createCursorTimeline([
  { frame: 0, x: 960, y: 540 },
  { frame: 40, x: 400, y: 300 },
  { frame: 120, x: 800, y: 400 },
  { frame: 200, x: 1200, y: 600 },
  { frame: 300, x: 960, y: 540 },
]);

// Cursor type — pure function of frame
const getCursorType = (frame: number): CursorType => {
  if (frame < 40) return "default";
  if (frame < 120) return "crosshair";
  if (frame < 200) return "grabbing";
  return "default";
};

// Cursor opacity — driven by interpolate(), fades in at frame 10 and out at frame 280
const getCursorOpacity = (frame: number): number => {
  const fadeIn = interpolate(frame, [10, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [280, 285], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
};

// Selection box state — pure function of frame
const getSelectionBoxOpacity = (frame: number): number => {
  const fadeIn = interpolate(frame, [40, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [120, 125], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(fadeIn, fadeOut);
};

// Label status — pure function of frame
const getLabelStatus = (frame: number): SelectionLabelStatus => {
  if (frame < 80) return "idle";
  if (frame < 120) return "copying";
  if (frame < 160) return "copied";
  return "idle";
};

// Label opacity — driven entirely by interpolate()
const getLabelOpacity = (frame: number): number => {
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

  // All state derived purely from useCurrentFrame() — no useState
  const cursorPos = getCursorPosition(frame);
  const cursorType = getCursorType(frame);
  const cursorOpacity = getCursorOpacity(frame);
  const selectionBoxOpacity = getSelectionBoxOpacity(frame);
  const labelStatus = getLabelStatus(frame);
  const labelOpacity = getLabelOpacity(frame);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      {/* Selection box — opacity derived from frame via interpolate() */}
      {selectionBoxOpacity > 0 && (
        <SelectionBox
          x={350}
          y={250}
          width={200}
          height={100}
          showAt={40}
          hideAt={120}
        />
      )}

      {/* Success flash — pulse driven by frame via interpolate() */}
      <SuccessFlash
        x={350}
        y={250}
        width={200}
        height={100}
        triggerAt={100}
        duration={12}
      />

      {/* Label — status and opacity all pure functions of frame */}
      {labelOpacity > 0 && (
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

      {/* Cursor — position, type, opacity all pure functions of frame */}
      <Cursor
        x={cursorPos.x}
        y={cursorPos.y}
        type={cursorType}
        opacity={cursorOpacity}
      />
    </AbsoluteFill>
  );
};
