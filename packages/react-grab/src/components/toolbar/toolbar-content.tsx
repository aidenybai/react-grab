import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { PANEL_STYLES } from "../../constants.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";

export interface ToolbarContentProps {
  isActive?: boolean;
  enabled?: boolean;
  isCollapsed?: boolean;
  snapEdge?: "top" | "bottom" | "left" | "right";
  isShaking?: boolean;
  onAnimationEnd?: () => void;
  onPanelClick?: (event: MouseEvent) => void;
  selectButton?: JSX.Element;
  toggleButton?: JSX.Element;
  collapseButton?: JSX.Element;
  shakeTooltip?: JSX.Element;
  transformOrigin?: string;
}

export const ToolbarContent: Component<ToolbarContentProps> = (props) => {
  const edge = () => props.snapEdge ?? "bottom";

  const collapsedEdgeClasses = () => {
    if (!props.isCollapsed) return "";
    const roundedClass = {
      top: "rounded-t-none rounded-b-[10px]",
      bottom: "rounded-b-none rounded-t-[10px]",
      left: "rounded-l-none rounded-r-[10px]",
      right: "rounded-r-none rounded-l-[10px]",
    }[edge()];
    const paddingClass =
      edge() === "top" || edge() === "bottom" ? "px-2 py-0.25" : "px-0.25 py-2";
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
    <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale mr-1.5">
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
    <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none mx-0.5">
      <div
        class={cn(
          "relative w-5 h-3 rounded-full transition-colors",
          props.enabled ? "bg-black" : "bg-black/25",
        )}
      >
        <div
          class={cn(
            "absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform",
            props.enabled ? "left-2.5" : "left-0.5",
          )}
        />
      </div>
    </button>
  );

  const defaultCollapseButton = () => (
    <button class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale">
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
        PANEL_STYLES,
        !props.isCollapsed && "py-1.5 gap-1.5 px-2",
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
          props.isCollapsed
            ? "grid-cols-[0fr] opacity-0"
            : "grid-cols-[1fr] opacity-100",
        )}
      >
        <div class="flex items-center min-w-0">
          <div
            class={cn(
              "grid transition-all duration-150 ease-out overflow-hidden",
              props.enabled
                ? "grid-cols-[1fr] opacity-100"
                : "grid-cols-[0fr] opacity-0",
            )}
          >
            <div class="relative overflow-hidden min-w-0">
              {props.selectButton ?? defaultSelectButton()}
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
