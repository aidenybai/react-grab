import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { IconClock } from "../icons/icon-clock.jsx";
import { IconCopy } from "../icons/icon-copy.jsx";
import { IconEllipsis } from "../icons/icon-ellipsis.jsx";
import {
  getExpandGridClass,
  getButtonSpacingClass,
  getMinDimensionClass,
  getHitboxConstraintClass,
} from "../../utils/toolbar-layout.js";

export interface ToolbarContentProps {
  isActive?: boolean;
  enabled?: boolean;
  isCollapsed?: boolean;
  snapEdge?: "top" | "bottom" | "left" | "right";
  isShaking?: boolean;
  isHistoryExpanded?: boolean;
  isCopyAllExpanded?: boolean;
  isMenuExpanded?: boolean;
  isMenuOpen?: boolean;
  isHistoryPinned?: boolean;
  disableGridTransitions?: boolean;
  onAnimationEnd?: () => void;
  onPanelClick?: (event: MouseEvent) => void;
  onCollapseClick?: (event: MouseEvent) => void;
  onExpandableButtonsRef?: (element: HTMLDivElement) => void;
  selectButton?: JSX.Element;
  historyButton?: JSX.Element;
  copyAllButton?: JSX.Element;
  menuButton?: JSX.Element;
  toggleButton?: JSX.Element;
  collapseButton?: JSX.Element;
  shakeTooltip?: JSX.Element;
  transformOrigin?: string;
}

export const ToolbarContent: Component<ToolbarContentProps> = (props) => {
  const edge = () => props.snapEdge ?? "bottom";
  const isVertical = () => edge() === "left" || edge() === "right";

  const expandGridClass = (
    isExpanded: boolean,
    collapsedExtra?: string,
  ): string => getExpandGridClass(isVertical(), isExpanded, collapsedExtra);

  const gridTransitionClass = (): string => {
    if (props.disableGridTransitions) return "";
    if (isVertical()) {
      return "transition-[grid-template-rows,opacity] duration-150 ease-out";
    }
    return "transition-[grid-template-columns,opacity] duration-150 ease-out";
  };

  const buttonSpacingClass = () => getButtonSpacingClass(isVertical());
  const minDimensionClass = () => getMinDimensionClass(isVertical());
  const hitboxConstraintClass = () => getHitboxConstraintClass(isVertical());

  const collapsedEdgeClasses = () => {
    if (!props.isCollapsed) return "";
    const roundedClass = {
      top: "rounded-t-none rounded-b-[10px]",
      bottom: "rounded-b-none rounded-t-[10px]",
      left: "rounded-l-none rounded-r-[10px]",
      right: "rounded-r-none rounded-l-[10px]",
    }[edge()];
    const paddingClass = isVertical() ? "px-0.25 py-2" : "px-2 py-0.25";
    return `${roundedClass} ${paddingClass}`;
  };

  const chevronRotation = () => {
    const collapsed = props.isCollapsed;
    switch (edge()) {
      case "top":
        return collapsed ? "rotate-180" : "rotate-0";
      case "bottom":
        return collapsed ? "rotate-0" : "rotate-180";
      case "left":
        return collapsed ? "rotate-90" : "-rotate-90";
      case "right":
        return collapsed ? "-rotate-90" : "rotate-90";
      default:
        return "rotate-0";
    }
  };

  const defaultSelectButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-toggle
      aria-label={props.isActive ? "Stop selecting element" : "Select element"}
      aria-pressed={props.isActive ? "true" : "false"}
      class={cn(
        "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
        buttonSpacingClass(),
        hitboxConstraintClass(),
      )}
    >
      <IconSelect
        size={14}
        class={cn(
          "transition-colors",
          props.isActive ? "text-black" : "text-black/70",
        )}
      />
    </button>
  );

  const defaultHistoryButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-history
      aria-label="Open history"
      class={cn(
        "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
        buttonSpacingClass(),
        hitboxConstraintClass(),
      )}
    >
      <IconClock
        size={14}
        class={cn(
          "transition-colors",
          props.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]",
        )}
      />
    </button>
  );

  const defaultCopyAllButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-copy-all
      aria-label="Copy all history items"
      class={cn(
        "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
        buttonSpacingClass(),
        hitboxConstraintClass(),
      )}
    >
      <IconCopy size={14} class="text-[#B3B3B3] transition-colors" />
    </button>
  );

  const defaultMenuButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-menu
      aria-label={
        props.isMenuOpen ? "Close more actions menu" : "Open more actions menu"
      }
      class={cn(
        "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
        buttonSpacingClass(),
        hitboxConstraintClass(),
      )}
    >
      <IconEllipsis
        size={14}
        class={cn(
          "transition-colors",
          props.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]",
        )}
      />
    </button>
  );

  const defaultToggleButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-enabled
      aria-label={props.enabled ? "Disable React Grab" : "Enable React Grab"}
      aria-pressed={props.enabled ? "true" : "false"}
      class={cn(
        "contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none",
        isVertical() ? "my-0.5" : "mx-0.5",
      )}
    >
      <div
        class={cn(
          "relative rounded-full transition-colors",
          isVertical() ? "w-3.5 h-2.5" : "w-5 h-3",
          props.enabled ? "bg-black" : "bg-black/25",
        )}
      >
        <div
          class={cn(
            "absolute top-0.5 rounded-full bg-white transition-transform",
            isVertical() ? "w-1.5 h-1.5" : "w-2 h-2",
            !props.enabled && "left-0.5",
            props.enabled && (isVertical() ? "left-1.5" : "left-2.5"),
          )}
        />
      </div>
    </button>
  );

  const defaultCollapseButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-collapse
      aria-label={props.isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
      class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
      onClick={props.onCollapseClick}
    >
      <IconChevron
        size={14}
        class={cn(
          "text-[#B3B3B3] transition-transform duration-150",
          chevronRotation(),
        )}
      />
    </button>
  );

  return (
    <div
      class={cn(
        "flex items-center justify-center rounded-[10px] antialiased relative overflow-visible [font-synthesis:none] filter-[drop-shadow(0px_1px_2px_#51515140)] [corner-shape:superellipse(1.25)]",
        isVertical() && "flex-col",
        "bg-white",
        !props.isCollapsed &&
          (isVertical() ? "px-1.5 gap-1.5 py-2" : "py-1.5 gap-1.5 px-2"),
        collapsedEdgeClasses(),
        props.isShaking && "animate-shake",
      )}
      style={{ "transform-origin": props.transformOrigin }}
      onAnimationEnd={props.onAnimationEnd}
      onClick={props.onPanelClick}
    >
      <div
        class={cn(
          "grid",
          gridTransitionClass(),
          expandGridClass(!props.isCollapsed, "pointer-events-none"),
        )}
      >
        <div
          class={cn(
            "flex",
            isVertical()
              ? "flex-col items-center min-h-0"
              : "items-center min-w-0",
          )}
        >
          <div
            ref={(element) => props.onExpandableButtonsRef?.(element)}
            class={cn("flex items-center", isVertical() && "flex-col")}
          >
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(Boolean(props.enabled)),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.selectButton ?? defaultSelectButton()}
              </div>
            </div>
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(
                  Boolean(props.enabled) && Boolean(props.isHistoryExpanded),
                  "pointer-events-none",
                ),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.historyButton ?? defaultHistoryButton()}
              </div>
            </div>
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(
                  Boolean(props.isCopyAllExpanded),
                  "pointer-events-none",
                ),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.copyAllButton ?? defaultCopyAllButton()}
              </div>
            </div>
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(
                  Boolean(props.enabled) && Boolean(props.isMenuExpanded),
                  "pointer-events-none",
                ),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.menuButton ?? defaultMenuButton()}
              </div>
            </div>
          </div>
          <div class="relative shrink-0 overflow-visible">
            {props.toggleButton ?? defaultToggleButton()}
          </div>
        </div>
      </div>
      {props.collapseButton ?? defaultCollapseButton()}
      {props.shakeTooltip}
    </div>
  );
};
