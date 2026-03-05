import type React from "react";
import { cn } from "../utils/cn";
import { PANEL_STYLES } from "../constants";
import { TagBadge } from "./selection-label/TagBadge";
import { BottomSection } from "./selection-label/BottomSection";

interface ContextMenuItem {
  label: string;
  shortcut?: string;
  active?: boolean;
}

interface ContextMenuProps {
  /** Absolute x position */
  x: number;
  /** Absolute y position */
  y: number;
  tagName: string;
  componentName?: string;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  tagName,
  componentName,
  items,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        filter: "drop-shadow(0px 1px 2px #51515140)",
        zIndex: 2147483647,
      }}
      className="font-sans text-[13px] antialiased select-none"
    >
      <div
        className={cn(
          "flex flex-col justify-center items-start rounded-[10px] antialiased w-fit h-fit min-w-[100px]",
          PANEL_STYLES,
        )}
      >
        <div className="shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">
          <TagBadge
            tagName={tagName}
            componentName={componentName}
            shrink
          />
        </div>
        <BottomSection>
          <div className="flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5">
            {items.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1",
                  item.active && "bg-black/5",
                )}
              >
                <span className="text-[13px] leading-4 font-sans font-medium text-black">
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className="text-[11px] font-sans text-black/50 ml-4">
                    {item.shortcut}
                  </span>
                )}
              </div>
            ))}
          </div>
        </BottomSection>
      </div>
    </div>
  );
};
