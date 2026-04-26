import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { getExpandGridClass, getMinDimensionClass } from "../../utils/toolbar-layout.js";

interface ToolbarContentProps {
  isCollapsed?: boolean;
  snapEdge?: "top" | "bottom" | "left" | "right";
  isShaking?: boolean;
  isCommentsExpanded?: boolean;
  isCopyAllExpanded?: boolean;
  isChevronPressed?: boolean;
  onAnimationEnd?: () => void;
  onPanelClick?: (event: MouseEvent) => void;
  onCollapseClick?: (event: MouseEvent) => void;
  onCollapsePointerDown?: (event: PointerEvent) => void;
  onCollapsePointerUp?: (event: PointerEvent) => void;
  onCollapsePointerLeave?: (event: PointerEvent) => void;
  selectButton?: JSX.Element;
  commentsButton?: JSX.Element;
  copyAllButton?: JSX.Element;
  collapseButton?: JSX.Element;
  transformOrigin?: string;
}

export const ToolbarContent: Component<ToolbarContentProps> = (props) => {
  const edge = () => props.snapEdge ?? "bottom";
  const isVertical = () => edge() === "left" || edge() === "right";

  // Asymmetric timing: opacity leads on collapse (content fades before size
  // shrinks) and follows on expand (size grows, then content materializes).
  // Size uses the longer curve on expand for a more deliberate reveal.
  const sizeDurationClass = () => (props.isCollapsed ? "duration-140" : "duration-220");
  const opacityEnterClass = "transition-opacity duration-180 ease-drawer delay-[80ms]";
  const opacityExitClass = "transition-opacity duration-100 ease-drawer";

  const expandGridClass = (isExpanded: boolean, collapsedExtra?: string): string =>
    getExpandGridClass(isVertical(), isExpanded, collapsedExtra);

  // Tailwind v4 scans source files for class names as literal strings.
  // Template-interpolated classes like `transition-[${axis},opacity]` are
  // invisible to the scanner, so keep each variant as a full static string
  // and branch on isVertical() at usage time.
  const gridTransitionClass = (): string =>
    isVertical()
      ? `transition-[grid-template-rows,opacity] ${sizeDurationClass()} ease-drawer`
      : `transition-[grid-template-columns,opacity] ${sizeDurationClass()} ease-drawer`;

  const gridSizeTransitionClass = (): string =>
    isVertical()
      ? `transition-[grid-template-rows] ${sizeDurationClass()} ease-drawer`
      : `transition-[grid-template-columns] ${sizeDurationClass()} ease-drawer`;

  const minDimensionClass = () => getMinDimensionClass(isVertical());

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

  // Chevron press squishes the toolbar toward its snap edge: the axis
  // perpendicular to the edge compresses 3%, keeping the snapped edge flush.
  const pressSquishTransform = (): string | undefined => {
    if (!props.isChevronPressed) return undefined;
    return isVertical() ? "scale(0.97, 1)" : "scale(1, 0.97)";
  };

  const defaultCollapseButton = () => (
    <button
      data-react-grab-ignore-events
      data-react-grab-toolbar-collapse
      aria-label={props.isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
      class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
      onClick={props.onCollapseClick}
      // Native pointerdown so the press squish handler runs before the
      // wrapper's bubble-phase stopImmediatePropagation. Solid delegates
      // onPointerDown to document, which never receives this event.
      on:pointerdown={props.onCollapsePointerDown}
      onPointerUp={props.onCollapsePointerUp}
      onPointerLeave={props.onCollapsePointerLeave}
      onPointerCancel={props.onCollapsePointerLeave}
    >
      <IconChevron
        size={14}
        class={cn(
          "text-[#B3B3B3] transition-transform duration-150 ease-drawer",
          chevronRotation(),
        )}
      />
    </button>
  );

  // Press transition is fast (60ms linear-ease-out) for instant feedback;
  // release is a 300ms drawer curve so the squish settles naturally.
  const outerTransitionClass = () =>
    props.isChevronPressed
      ? `transition-[padding,border-radius,transform] duration-60 ease-[cubic-bezier(0,0,0.2,1)]`
      : `transition-[padding,border-radius,transform] ${sizeDurationClass()} ease-drawer`;

  return (
    <div
      class={cn(
        "flex items-center justify-center rounded-[10px] antialiased relative overflow-visible [font-synthesis:none] border border-[#D9D9D9] filter-[drop-shadow(0px_1px_2px_#51515133)] [corner-shape:superellipse(1.25)]",
        outerTransitionClass(),
        isVertical() && "flex-col",
        "bg-white",
        !props.isCollapsed && (isVertical() ? "px-1.5 gap-1 py-2" : "py-1.5 gap-1 px-2"),
        collapsedEdgeClasses(),
        props.isShaking && "animate-shake",
      )}
      style={{ "transform-origin": props.transformOrigin, transform: pressSquishTransform() }}
      onAnimationEnd={props.onAnimationEnd}
      onClick={props.onPanelClick}
    >
      <div
        class={cn(
          "grid relative overflow-visible",
          gridSizeTransitionClass(),
          props.isCollapsed
            ? isVertical()
              ? "grid-rows-[0fr] pointer-events-none"
              : "grid-cols-[0fr] pointer-events-none"
            : isVertical()
              ? "grid-rows-[1fr]"
              : "grid-cols-[1fr]",
        )}
      >
        <div
          class={cn(
            "flex",
            isVertical() ? "flex-col items-center min-h-0" : "items-center min-w-0",
            props.isCollapsed ? "opacity-0" : "opacity-100",
            props.isCollapsed ? opacityExitClass : opacityEnterClass,
          )}
        >
          <div class={cn("flex items-center", isVertical() && "flex-col")}>
            <div class={cn("relative overflow-visible", minDimensionClass())}>
              {props.selectButton}
            </div>
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(Boolean(props.isCommentsExpanded), "pointer-events-none"),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.commentsButton}
              </div>
            </div>
            <div
              class={cn(
                "grid",
                gridTransitionClass(),
                expandGridClass(Boolean(props.isCopyAllExpanded), "pointer-events-none"),
              )}
            >
              <div class={cn("relative overflow-visible", minDimensionClass())}>
                {props.copyAllButton}
              </div>
            </div>
          </div>
        </div>
      </div>
      {props.collapseButton ?? defaultCollapseButton()}
    </div>
  );
};
