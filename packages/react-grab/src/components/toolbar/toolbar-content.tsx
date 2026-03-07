import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { PANEL_STYLES } from "../../constants.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
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
  onAnimationEnd?: () => void;
  onPanelClick?: (event: MouseEvent) => void;
  selectButton?: JSX.Element;
  historyButton?: JSX.Element;
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
      aria-label={props.isActive ? "Stop selecting element" : "Select element"}
      aria-pressed={Boolean(props.isActive)}
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

  const defaultToggleButton = () => (
    <button
      aria-label={props.enabled ? "Disable React Grab" : "Enable React Grab"}
      aria-pressed={Boolean(props.enabled)}
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
      aria-label={props.isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
      class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
    >
      <IconChevron
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
        "flex items-center justify-center rounded-[10px] antialiased transition-all duration-150 ease-out relative overflow-visible [font-synthesis:none] filter-[drop-shadow(0px_1px_2px_#51515140)] [corner-shape:superellipse(1.25)]",
        isVertical() && "flex-col",
        PANEL_STYLES,
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
          "grid transition-all duration-150 ease-out",
          expandGridClass(!props.isCollapsed),
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
            class={cn(
              "grid transition-all duration-150 ease-out",
              expandGridClass(Boolean(props.enabled)),
            )}
          >
            <div class={cn("relative overflow-visible", minDimensionClass())}>
              {props.selectButton ?? defaultSelectButton()}
            </div>
          </div>
          {props.historyButton}
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
