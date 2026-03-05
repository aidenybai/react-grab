import type React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  BACKGROUND_COLOR,
  S3_CURSOR_ARRIVE,
  S3_SELECTION_SHOW,
  S3_LABEL_SHOW,
  S3_PROMPT_MODE,
  S3_TYPING_START,
  S3_TYPING_CHARS,
  S3_COMMENT_TEXT,
  S3_THINKING_START,
  S3_COMPLETION_START,
  TOOLBAR_X,
  TOOLBAR_Y,
} from "../constants";
import { Dashboard, EXPORT_BUTTON } from "../components/Dashboard";
import { ToolbarContent } from "../components/ToolbarContent";
import { Cursor } from "../components/Cursor";
import { SelectionBox } from "../components/SelectionBox";
import { SelectionLabel } from "../components/selection-label/SelectionLabel";
import type { SelectionLabelStatus } from "../components/selection-label/SelectionLabel";
import { createCursorTimeline } from "../utils/createCursorTimeline";
import { geistFontFamily } from "../utils/fonts";

const exportCenter = {
  x: EXPORT_BUTTON.x + EXPORT_BUTTON.width / 2,
  y: EXPORT_BUTTON.y + EXPORT_BUTTON.height / 2,
};

const getCursorPosition = createCursorTimeline([
  { frame: 0, x: 960, y: 540 },
  { frame: S3_CURSOR_ARRIVE, x: exportCenter.x, y: exportCenter.y },
  { frame: 200, x: exportCenter.x, y: exportCenter.y },
]);

const getCursorOpacity = (frame: number): number => {
  return interpolate(frame, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const getLabelStatus = (frame: number): SelectionLabelStatus => {
  if (frame < S3_THINKING_START) return "idle";
  if (frame < S3_COMPLETION_START) return "copying";
  return "copied";
};

const getIsPromptMode = (frame: number): boolean => {
  return frame >= S3_PROMPT_MODE && frame < S3_THINKING_START;
};

const getTypedText = (frame: number): string => {
  if (frame < S3_TYPING_START) return "";
  const elapsed = frame - S3_TYPING_START;
  const charCount = Math.min(
    Math.floor(elapsed / S3_TYPING_CHARS),
    S3_COMMENT_TEXT.length,
  );
  return S3_COMMENT_TEXT.slice(0, charCount);
};

const getLabelOpacity = (frame: number): number => {
  return interpolate(frame, [S3_LABEL_SHOW, S3_LABEL_SHOW + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/**
 * Scene 3 — Comment Flow (frames 0-200 relative, 240-440 absolute)
 * Cursor moves to Export button. Label goes idle -> prompt/comment mode ->
 * types "add CSV option" char-by-char -> submit -> Thinking... -> Applied changes with Undo + Keep.
 */
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();

  const cursorPos = getCursorPosition(frame);
  const cursorOpacity = getCursorOpacity(frame);
  const labelStatus = getLabelStatus(frame);
  const isPromptMode = getIsPromptMode(frame);
  const typedText = getTypedText(frame);
  const labelOpacity = getLabelOpacity(frame);

  const statusText = labelStatus === "copying"
    ? "Thinking\u2026"
    : "Applied changes";

  const inputValue = labelStatus === "copying" ? S3_COMMENT_TEXT : typedText;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      <Dashboard />

      {/* Toolbar */}
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

      {/* SelectionBox on Export button */}
      <SelectionBox
        x={EXPORT_BUTTON.x}
        y={EXPORT_BUTTON.y}
        width={EXPORT_BUTTON.width}
        height={EXPORT_BUTTON.height}
        showAt={S3_SELECTION_SHOW}
      />

      {/* SelectionLabel below Export button */}
      {labelOpacity > 0 && (
        <SelectionLabel
          x={EXPORT_BUTTON.x + EXPORT_BUTTON.width / 2}
          y={EXPORT_BUTTON.y + EXPORT_BUTTON.height + 10}
          tagName="button"
          componentName="ExportBtn"
          status={labelStatus}
          statusText={statusText}
          isPromptMode={isPromptMode}
          inputValue={inputValue}
          hasAgent
          supportsUndo
          shimmerStartFrame={S3_THINKING_START}
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
