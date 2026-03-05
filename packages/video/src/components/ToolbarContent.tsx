import type React from "react";
import { cn } from "../utils/cn";
import { PANEL_STYLES } from "../constants";
import { IconSelect } from "./icons/IconSelect";
import { IconChevron } from "./icons/IconChevron";
import { IconClock } from "./icons/IconClock";

interface ToolbarContentProps {
  isActive?: boolean;
  enabled?: boolean;
  isCollapsed?: boolean;
  showHistoryBadge?: boolean;
}

export const ToolbarContent: React.FC<ToolbarContentProps> = ({
  isActive,
  enabled,
  isCollapsed,
  showHistoryBadge,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[10px] antialiased relative overflow-visible filter-[drop-shadow(0px_1px_2px_#51515140)]",
        PANEL_STYLES,
        !isCollapsed && "py-1.5 gap-1.5 px-2",
        isCollapsed && "rounded-b-none rounded-t-[10px] px-2 py-0.25",
      )}
    >
      {/* Main content row */}
      <div className="flex items-center">
        {/* Select button - shown when enabled */}
        {enabled && (
          <div className="flex items-center justify-center p-1">
            <IconSelect
              size={14}
              className={cn(isActive ? "text-black" : "text-black/70")}
            />
          </div>
        )}

        {/* History button */}
        <div className="relative flex items-center justify-center p-1">
          <IconClock size={14} className="text-black/70" />
          {showHistoryBadge && (
            <div className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-grab-pink" />
          )}
        </div>

        {/* Toggle switch */}
        <div className={cn("flex items-center justify-center", "mx-0.5")}>
          <div
            className={cn(
              "relative rounded-full",
              "w-5 h-3",
              enabled ? "bg-black" : "bg-black/25",
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 rounded-full bg-white",
                "w-2 h-2",
                !enabled && "left-0.5",
                enabled && "left-2.5",
              )}
            />
          </div>
        </div>
      </div>

      {/* Collapse chevron */}
      <div className="shrink-0 flex items-center justify-center">
        <IconChevron
          className={cn(
            "text-[#B3B3B3]",
            isCollapsed ? "rotate-0" : "rotate-180",
          )}
        />
      </div>
    </div>
  );
};
