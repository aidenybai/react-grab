import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import {
  TOOLBAR_ACTIVE_ACCENT_COLOR,
  TOOLBAR_COMMENT_ICON_SIZE_PX,
} from "../../constants.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconComment } from "../icons/icon-comment.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { getToolbarIconColor } from "../../utils/get-toolbar-icon-color.js";

export interface ToolbarContentProps {
  isActive?: boolean;
  isCommentMode?: boolean;
  enabled?: boolean;
  isCollapsed?: boolean;
  snapEdge?: "top" | "bottom" | "left" | "right";
  isShaking?: boolean;
  onAnimationEnd?: () => void;
  onPanelClick?: (event: MouseEvent) => void;
  selectButton?: JSX.Element;
  commentButton?: JSX.Element;
  recentButton?: JSX.Element;
  toggleButton?: JSX.Element;
  collapseButton?: JSX.Element;
  shakeTooltip?: JSX.Element;
  transformOrigin?: string;
}

export const ToolbarContent: Component<ToolbarContentProps> = (props) => {
  const edge = () => props.snapEdge ?? "bottom";

  const collapsedPaddingClasses = () => {
    if (!props.isCollapsed) return "";
    const paddingClass =
      edge() === "top" || edge() === "bottom" ? "px-2 py-0.25" : "px-0.25 py-2";
    return paddingClass;
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
    <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox mr-1.5">
      <IconSelect
        size={14}
        style={
          Boolean(props.isActive) && !props.isCommentMode
            ? { color: TOOLBAR_ACTIVE_ACCENT_COLOR }
            : undefined
        }
        class={cn(
          "transition-colors",
          getToolbarIconColor(
            Boolean(props.isActive) && !props.isCommentMode,
            Boolean(props.isCommentMode),
          ),
        )}
      />
    </button>
  );

  const defaultCommentButton = () => (
    <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox mr-1.5">
      <IconComment
        size={TOOLBAR_COMMENT_ICON_SIZE_PX}
        isActive={Boolean(props.isCommentMode)}
        style={
          Boolean(props.isCommentMode)
            ? { color: TOOLBAR_ACTIVE_ACCENT_COLOR }
            : undefined
        }
        class={cn(
          "transition-colors",
          getToolbarIconColor(
            Boolean(props.isCommentMode),
            Boolean(props.isActive) && !props.isCommentMode,
          ),
        )}
      />
    </button>
  );

  const defaultToggleButton = () => (
    <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none mx-0.5">
      <div
        class={cn(
          "relative w-5 h-3 rounded-full transition-colors",
          props.enabled ? "bg-white" : "bg-white/25",
        )}
      >
        <div
          class={cn(
            "absolute top-0.5 w-2 h-2 rounded-full bg-black transition-transform",
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
          "text-white/70 transition-transform duration-150",
          chevronRotation(),
        )}
      />
    </button>
  );

  return (
    <div
      class={cn(
        "flex items-center justify-center rounded-full antialiased transition-all duration-150 ease-out relative overflow-visible [font-synthesis:none] filter-[drop-shadow(0px_1px_2px_#51515140)] [corner-shape:superellipse(1.25)]",
        "bg-black",
        !props.isCollapsed && "py-1.5 gap-1.5 px-2",
        collapsedPaddingClasses(),
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
              "grid transition-all duration-150 ease-out",
              props.enabled
                ? "grid-cols-[1fr] opacity-100"
                : "grid-cols-[0fr] opacity-0",
            )}
          >
            <div class="relative overflow-visible min-w-0">
              {props.selectButton ?? defaultSelectButton()}
            </div>
          </div>
          <div
            class={cn(
              "grid transition-all duration-150 ease-out",
              props.enabled
                ? "grid-cols-[1fr] opacity-100"
                : "grid-cols-[0fr] opacity-0",
            )}
          >
            <div class="relative overflow-visible min-w-0">
              {props.commentButton ?? defaultCommentButton()}
            </div>
          </div>
          {props.recentButton}
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
