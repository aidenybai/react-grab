import type React from "react";
import { cn } from "../utils/cn";
import { PANEL_STYLES } from "../constants";

interface HistoryItem {
  id: string;
  name: string;
  commentText?: string;
  timestamp: string;
}

interface HistoryDropdownProps {
  /** Absolute x position */
  x: number;
  /** Absolute y position */
  y: number;
  items: HistoryItem[];
  opacity?: number;
  scale?: number;
}

export const HistoryDropdown: React.FC<HistoryDropdownProps> = ({
  x,
  y,
  items,
  opacity = 1,
  scale = 1,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        filter: "drop-shadow(0px 1px 2px #51515140)",
        zIndex: 2147483647,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "bottom center",
      }}
      className="font-sans text-[13px] antialiased select-none"
    >
      <div
        className={cn(
          "flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden",
          PANEL_STYLES,
        )}
        style={{ minWidth: "160px" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-2 pt-1.5 pb-1">
          <span className="text-[11px] font-medium text-black/40">History</span>
        </div>

        {/* Items list */}
        <div className="min-h-0 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] px-2 py-1.5">
          <div className="flex flex-col">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between w-full px-0 py-1 gap-2"
              >
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] leading-4 font-sans font-medium text-black truncate">
                    {item.name}
                  </span>
                  {item.commentText && (
                    <span className="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">
                      {item.commentText}
                    </span>
                  )}
                </span>
                <span className="shrink-0 flex items-center justify-end">
                  <span className="text-[10px] font-sans text-black/25">
                    {item.timestamp}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
