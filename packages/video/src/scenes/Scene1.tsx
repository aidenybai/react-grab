import type React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { BACKGROUND_COLOR, S1_TOOLBAR_ENTER_FRAME, TOOLBAR_X, TOOLBAR_Y } from "../constants";
import { Dashboard } from "../components/Dashboard";
import { ToolbarContent } from "../components/ToolbarContent";
import { geistFontFamily } from "../utils/fonts";

/**
 * Scene 1 — Dashboard + Toolbar (frames 0-80, 2s)
 * Dashboard is fully visible from frame 0.
 * Toolbar appears at bottom of screen via spring() translate-Y at ~frame 20.
 */
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Toolbar enters from below via spring()
  const toolbarProgress = spring({
    frame: frame - S1_TOOLBAR_ENTER_FRAME,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.5 },
  });

  // Translate from 60px below to 0
  const toolbarTranslateY = (1 - toolbarProgress) * 60;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      <Dashboard />

      {/* Toolbar at bottom center */}
      <div
        style={{
          position: "absolute",
          left: TOOLBAR_X,
          top: TOOLBAR_Y,
          transform: `translateX(-50%) translateY(${toolbarTranslateY}px)`,
          opacity: toolbarProgress,
          zIndex: 100,
        }}
      >
        <ToolbarContent
          isActive
          enabled
          isCollapsed={false}
          showHistoryBadge={false}
        />
      </div>
    </AbsoluteFill>
  );
};
