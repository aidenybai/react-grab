import {
  Show,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  type JSX,
} from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds, SelectionLabelStatus } from "../types.js";
import { VIEWPORT_MARGIN_PX } from "../constants.js";
import { cn } from "../utils/cn.js";
import { IconOpen } from "./icon-open.js";

interface SelectionLabelProps {
  tagName?: string;
  componentName?: string;
  selectionBounds?: OverlayBounds;
  mouseX?: number;
  visible?: boolean;
  isInputExpanded?: boolean;
  inputValue?: string;
  hasAgent?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  lineNumber?: number;
  isStale?: boolean;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onToggleExpand?: () => void;
  onAbort?: () => void;
  onOpen?: () => void;
}

interface TagBadgeProps {
  tagName: string;
  isClickable: boolean;
  onClick: (event: MouseEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
  showMono?: boolean;
  shrink?: boolean;
  forceShowIcon?: boolean;
}

interface ClickToCopyPillProps {
  onClick: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
  hasParent?: boolean;
}

interface BottomSectionProps {
  children: JSX.Element;
}

type ArrowPosition = "bottom" | "top";

const ARROW_HEIGHT = 8;
const LABEL_GAP = 4;
const IDLE_TIMEOUT_MS = 400;

const TAG_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)";

const TagBadge: Component<TagBadgeProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    props.onHoverChange?.(false);
  };

  return (
    <div
      class={cn(
        "contain-layout flex items-center px-[3px] py-0 h-4 rounded-[1px] gap-0.5 [border-width:0.5px] border-solid border-label-tag-border",
        props.shrink && "shrink-0 w-fit",
        props.isClickable && "cursor-pointer",
      )}
      style={{ "background-image": TAG_GRADIENT }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={props.onClick}
    >
      <span
        class={cn(
          "text-[#47004A] text-[11.5px] leading-3.5 shrink-0 w-fit h-fit",
          props.showMono
            ? "tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace]"
            : "tracking-[-0.04em] font-medium",
        )}
      >
        {props.tagName}
      </span>
      <Show when={props.isClickable || props.forceShowIcon}>
        <IconOpen
          size={10}
          class={cn(
            "text-label-tag-border transition-all duration-100",
            isHovered() || props.forceShowIcon
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[2px] w-0",
          )}
        />
      </Show>
    </div>
  );
};

const ParentBadge: Component<{ name: string }> = (props) => (
  <div class="contain-layout shrink-0 flex items-center w-fit h-4 rounded-[1px] gap-1 px-[3px] [border-width:0.5px] border-solid border-[#B3B3B3] py-0 bg-[#F7F7F7]">
    <span class="text-[#0C0C0C] text-[11.5px] leading-3.5 shrink-0 tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] w-fit h-fit">
      {props.name}
    </span>
  </div>
);

const ChevronSeparator: Component = () => (
  <div class="contain-layout shrink-0 flex items-center w-fit h-4 rounded-[1px] gap-1 px-[3px] [border-width:0.5px] border-solid border-white py-0">
    <span class="text-[#0C0C0C] text-[11.5px] leading-3.5 shrink-0 tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] w-fit h-fit">
      &gt;
    </span>
  </div>
);

interface ArrowProps {
  position: ArrowPosition;
  leftPx: number;
  color?: string;
}

const Arrow: Component<ArrowProps> = (props) => {
  const arrowColor = () => props.color ?? "white";

  return (
    <div
      class="absolute w-0 h-0"
      style={{
        left: `${props.leftPx}px`,
        ...(props.position === "bottom"
          ? { top: "0", transform: "translateX(-50%) translateY(-100%)" }
          : { bottom: "0", transform: "translateX(-50%) translateY(100%)" }),
        "border-left": "8px solid transparent",
        "border-right": "8px solid transparent",
        ...(props.position === "bottom"
          ? { "border-bottom": `8px solid ${arrowColor()}` }
          : { "border-top": `8px solid ${arrowColor()}` }),
      }}
    />
  );
};

const ClickToCopyPill: Component<ClickToCopyPillProps> = (props) => (
  <div
    class={cn(
      "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-[1.5px] gap-[3px]",
      props.asButton && "cursor-pointer",
      props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
    )}
    role="button"
    onClick={props.onClick}
  >
    <div class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
      {props.hasParent ? "Copy" : "Click to copy"}
    </div>
  </div>
);

const RETURN_KEY_ICON_URL =
  "https://workers.paper.design/file-assets/01K8D51Q7E2ESJTN18XN2MT96X/01KBEJ7N5GQ0ZZ7K456R42AP4V.svg";

const BOTTOM_SECTION_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(100% 0 0) 0%, oklab(96.1% 0 0) 5.92%)";

const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-[5px] w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-xs"
    style={{ "background-image": BOTTOM_SECTION_GRADIENT }}
  >
    {props.children}
  </div>
);

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;
  let isTagCurrentlyHovered = false;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);

  const isNotProcessing = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading";

  const measureContainer = () => {
    if (containerRef && !isTagCurrentlyHovered) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  const handleTagHoverChange = (hovered: boolean) => {
    isTagCurrentlyHovered = hovered;
  };

  const handleViewportChange = () => {
    setViewportVersion((version) => version + 1);
  };

  let idleTimeout: ReturnType<typeof setTimeout> | undefined;

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
    idleTimeout = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);
  };

  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (
      event.code === "Enter" &&
      isIdle() &&
      !props.isInputExpanded &&
      isNotProcessing()
    ) {
      event.preventDefault();
      event.stopPropagation();
      props.onToggleExpand?.();
    }
  };

  onMount(() => {
    measureContainer();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    resetIdleTimer();
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
  });

  createEffect(() => {
    void props.selectionBounds;
    resetIdleTimer();
  });

  createEffect(() => {
    if (props.visible) {
      requestAnimationFrame(measureContainer);
    }
  });

  createEffect(() => {
    void props.status;
    requestAnimationFrame(measureContainer);
  });

  createEffect(() => {
    if (props.isInputExpanded && inputRef) {
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    }
  });

  const computedPosition = () => {
    viewportVersion();
    const bounds = props.selectionBounds;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (!bounds || labelWidth === 0 || labelHeight === 0) {
      return { left: -9999, top: -9999, arrowLeft: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const selectionCenterX = bounds.x + bounds.width / 2;
    const cursorX = props.mouseX ?? selectionCenterX;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    let positionLeft = cursorX - labelWidth / 2;
    let positionTop = selectionBottom + ARROW_HEIGHT + LABEL_GAP;

    if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
      positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
    }
    if (positionLeft < VIEWPORT_MARGIN_PX) {
      positionLeft = VIEWPORT_MARGIN_PX;
    }

    const totalHeightNeeded = labelHeight + ARROW_HEIGHT + LABEL_GAP;
    const fitsBelow =
      positionTop + labelHeight <= viewportHeight - VIEWPORT_MARGIN_PX;

    if (!fitsBelow) {
      positionTop = selectionTop - totalHeightNeeded;
      setArrowPosition("top");
    } else {
      setArrowPosition("bottom");
    }

    if (positionTop < VIEWPORT_MARGIN_PX) {
      positionTop = VIEWPORT_MARGIN_PX;
    }

    const arrowLeft = Math.max(
      12,
      Math.min(cursorX - positionLeft, labelWidth - 12),
    );

    return { left: positionLeft, top: positionTop, arrowLeft };
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      props.onCancel?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
  };

  const tagDisplay = () => props.tagName || "element";

  const handleTagClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (props.filePath && props.onOpen) {
      props.onOpen();
    }
  };

  const isTagClickable = () => Boolean(props.filePath && props.onOpen);

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleSubmit = () => props.onSubmit?.();

  return (
    <Show when={props.visible !== false && props.selectionBounds}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        class="fixed font-sans antialiased transition-[opacity,filter] duration-100 ease-out filter-[drop-shadow(0px_0px_4px_#51515180)]"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": props.visible ? "auto" : "none",
          opacity: props.status === "fading" ? 0 : 1,
          filter: props.isStale
            ? "blur(4px) drop-shadow(0px 0px 4px #51515180)"
            : "drop-shadow(0px 0px 4px #51515180)",
        }}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Arrow
          position={arrowPosition()}
          leftPx={computedPosition().arrowLeft}
        />

        <Show when={props.status === "copied" || props.status === "fading"}>
          <div class="[font-synthesis:none] contain-layout shrink-0 flex items-center gap-1 rounded-xs bg-white antialiased w-fit h-fit py-1 px-1.5">
            <div class="contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-[1.5px] gap-[3px]">
              <div class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                {props.hasAgent ? "Completed" : "Copied"}
              </div>
            </div>
          </div>
        </Show>

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-xs bg-white antialiased w-fit h-fit p-0"
          style={{
            display: props.status === "copied" || props.status === "fading" ? "none" : undefined,
          }}
        >
          <Show when={props.status === "copying"}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
                <div class="contain-layout flex items-center px-0 py-px w-auto h-fit rounded-[1.5px] gap-[3px]">
                  <div class="text-black text-[12px] leading-4 tracking-[-0.04em] font-sans font-medium w-auto h-fit whitespace-normal react-grab-shimmer">
                    {props.statusText ?? "Grabbing…"}
                  </div>
                </div>
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <textarea
                    ref={inputRef}
                    class="text-black text-[12px] leading-4 tracking-[-0.04em] font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50"
                    style={{
                      // @ts-expect-error - field-sizing is not in the jsx spec
                      "field-sizing": "content",
                      "min-height": "16px",
                    }}
                    value={props.inputValue ?? ""}
                    placeholder="type to edit"
                    rows={1}
                    disabled
                  />
                  <Show when={props.onAbort}>
                    <button
                      class="contain-layout shrink-0 flex flex-col items-start rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] p-1 size-fit cursor-pointer ml-1 transition-none hover:scale-105"
                      onClick={props.onAbort}
                    >
                      <div class="shrink-0 w-[7px] h-[7px] rounded-[1px] bg-black" />
                    </button>
                  </Show>
                </div>
              </BottomSection>
            </div>
          </Show>

          <Show when={isNotProcessing() && !props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit px-1.5">
                <ClickToCopyPill onClick={handleSubmit} shrink hasParent={!!props.componentName} />
                <Show when={props.componentName}>
                  <div class="contain-layout shrink-0 flex items-center gap-px w-fit h-fit">
                    <ParentBadge name={props.componentName!} />
                    <ChevronSeparator />
                    <TagBadge
                      tagName={tagDisplay()}
                      isClickable={isTagClickable()}
                      onClick={handleTagClick}
                      onHoverChange={handleTagHoverChange}
                      showMono
                      shrink
                    />
                  </div>
                </Show>
                <Show when={!props.componentName}>
                  <TagBadge
                    tagName={tagDisplay()}
                    isClickable={isTagClickable()}
                    onClick={handleTagClick}
                    onHoverChange={handleTagHoverChange}
                    showMono
                    shrink
                  />
                </Show>
              </div>
              <div
                class="grid w-full transition-[grid-template-rows] duration-30 ease-out"
                style={{
                  "grid-template-rows": isIdle() ? "1fr" : "0fr",
                }}
              >
                <div class="overflow-hidden min-h-0">
                  <BottomSection>
                    <div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit">
                      <span class="text-label-muted text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                        Press
                      </span>
                      <div class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit">
                        <div
                          class="w-2.5 h-[9px] shrink-0 opacity-[0.99] bg-cover bg-center"
                          style={{ "background-image": `url(${RETURN_KEY_ICON_URL})` }}
                        />
                      </div>
                      <span class="text-label-muted text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                        to edit
                      </span>
                    </div>
                  </BottomSection>
                </div>
              </div>
            </div>
          </Show>

          <Show when={isNotProcessing() && props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-fit h-fit">
                <ClickToCopyPill onClick={handleSubmit} dimmed shrink hasParent={!!props.componentName} />
                <Show when={props.componentName}>
                  <div class="contain-layout shrink-0 flex items-center gap-px w-fit h-fit">
                    <ParentBadge name={props.componentName!} />
                    <ChevronSeparator />
                    <TagBadge
                      tagName={tagDisplay()}
                      isClickable={isTagClickable()}
                      onClick={handleTagClick}
                      onHoverChange={handleTagHoverChange}
                      showMono
                      shrink
                      forceShowIcon
                    />
                  </div>
                </Show>
                <Show when={!props.componentName}>
                  <TagBadge
                    tagName={tagDisplay()}
                    isClickable={isTagClickable()}
                    onClick={handleTagClick}
                    onHoverChange={handleTagHoverChange}
                    showMono
                    shrink
                    forceShowIcon
                  />
                </Show>
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <textarea
                    ref={inputRef}
                    class="text-black text-[12px] leading-4 tracking-[-0.04em] font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0"
                    style={{
                      // @ts-expect-error - field-sizing is not in the jsx spec
                      "field-sizing": "content",
                      "min-height": "16px",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="type to edit"
                    rows={1}
                  />
                  <button
                    class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit cursor-pointer ml-1 transition-none hover:scale-105"
                    onClick={handleSubmit}
                  >
                    <div
                      class={cn(
                        "w-2.5 h-[9px] shrink-0 bg-cover bg-center transition-opacity duration-100",
                        props.inputValue ? "opacity-[0.99]" : "opacity-50",
                      )}
                      style={{ "background-image": `url(${RETURN_KEY_ICON_URL})` }}
                    />
                  </button>
                </div>
              </BottomSection>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
