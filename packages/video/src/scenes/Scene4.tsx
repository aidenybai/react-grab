import type React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  BACKGROUND_COLOR,
  S4_CURSOR_ARRIVE,
  S4_SELECTION_SHOW,
  S4_CONTEXT_MENU_SHOW,
  TOOLBAR_X,
  TOOLBAR_Y,
} from "../constants";
import { Dashboard, ACTIVITY_ROW_SIGNUP } from "../components/Dashboard";
import { ToolbarContent } from "../components/ToolbarContent";
import { Cursor } from "../components/Cursor";
import { SelectionBox } from "../components/SelectionBox";
import { ContextMenu } from "../components/ContextMenu";
import { createCursorTimeline } from "../utils/createCursorTimeline";
import { geistFontFamily } from "../utils/fonts";

const signupCenter = {
  x: ACTIVITY_ROW_SIGNUP.x + ACTIVITY_ROW_SIGNUP.width / 2,
  y: ACTIVITY_ROW_SIGNUP.y + ACTIVITY_ROW_SIGNUP.height / 2,
};

const getCursorPosition = createCursorTimeline([
  { frame: 0, x: 960, y: 400 },
  { frame: S4_CURSOR_ARRIVE, x: signupCenter.x, y: signupCenter.y },
  { frame: 80, x: signupCenter.x, y: signupCenter.y },
]);

const getCursorOpacity = (frame: number): number => {
  return interpolate(frame, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const getContextMenuOpacity = (frame: number): number => {
  return interpolate(frame, [S4_CONTEXT_MENU_SHOW, S4_CONTEXT_MENU_SHOW + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const CONTEXT_MENU_ITEMS = [
  { label: "Copy", shortcut: "\u2318C" },
  { label: "Copy HTML", shortcut: "\u2318\u21E7C" },
  { label: "Open", shortcut: "\u2318O" },
];

/**
 * Scene 4 — Context Menu (frames 0-80 relative, 440-520 absolute)
 * Cursor moves to "New signup" row. SelectionBox highlights it.
 * ContextMenu appears with TagBadge "SignupRow .div" and menu items.
 */
export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();

  const cursorPos = getCursorPosition(frame);
  const cursorOpacity = getCursorOpacity(frame);
  const contextMenuOpacity = getContextMenuOpacity(frame);

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
        <ToolbarContent isActive enabled isCollapsed={false} showHistoryBadge />
      </div>

      {/* SelectionBox on signup row */}
      <SelectionBox
        x={ACTIVITY_ROW_SIGNUP.x}
        y={ACTIVITY_ROW_SIGNUP.y}
        width={ACTIVITY_ROW_SIGNUP.width}
        height={ACTIVITY_ROW_SIGNUP.height}
        showAt={S4_SELECTION_SHOW}
      />

      {/* ContextMenu below signup row */}
      {contextMenuOpacity > 0 && (
        <div style={{ opacity: contextMenuOpacity }}>
          <ContextMenu
            x={ACTIVITY_ROW_SIGNUP.x + 24}
            y={ACTIVITY_ROW_SIGNUP.y + ACTIVITY_ROW_SIGNUP.height + 4}
            tagName="div"
            componentName="SignupRow"
            items={CONTEXT_MENU_ITEMS}
          />
        </div>
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
