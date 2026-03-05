import type React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import {
  BACKGROUND_COLOR,
  S5_DROPDOWN_SHOW,
  TOOLBAR_X,
  TOOLBAR_Y,
} from "../constants";
import { Dashboard } from "../components/Dashboard";
import { ToolbarContent } from "../components/ToolbarContent";
import { HistoryDropdown } from "../components/HistoryDropdown";
import { geistFontFamily } from "../utils/fonts";

const HISTORY_ITEMS = [
  { id: "1", name: "MetricCard", timestamp: "now" },
  { id: "2", name: "ExportBtn", commentText: "add CSV option", timestamp: "now" },
];

/**
 * Scene 5 — History (frames 0-80 relative, 520-600 absolute)
 * HistoryDropdown opens from toolbar with spring() scale 0.95->1 + opacity 0->1 over ~4 frames.
 * Shows MetricCard (now) and ExportBtn with comment (now). Holds for remaining frames.
 */
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // spring() for dropdown appearance
  const dropdownProgress = spring({
    frame: frame - S5_DROPDOWN_SHOW,
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.3 },
  });

  const dropdownScale = 0.95 + 0.05 * dropdownProgress;
  const dropdownOpacity = dropdownProgress;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    >
      <Dashboard />

      {/* Toolbar with history badge */}
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

      {/* HistoryDropdown above toolbar */}
      {dropdownOpacity > 0 && (
        <HistoryDropdown
          x={TOOLBAR_X - 80}
          y={TOOLBAR_Y - 120}
          items={HISTORY_ITEMS}
          opacity={dropdownOpacity}
          scale={dropdownScale}
        />
      )}
    </AbsoluteFill>
  );
};
