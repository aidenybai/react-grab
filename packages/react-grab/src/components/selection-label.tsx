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
import { IconCheckmark } from "./icon-checkmark.js";
import { IconCursorSimple } from "./icon-cursor-simple.js";
import { IconOpen } from "./icon-open.js";
import { IconReturnKey } from "./icon-return-key.js";
import { IconStop } from "./icon-stop.js";

interface SelectionLabelProps {
  tagName?: string;
  selectionBounds?: OverlayBounds;
  visible?: boolean;
  isInputExpanded?: boolean;
  inputValue?: string;
  hasAgent?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  lineNumber?: number;
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
}

interface ActionPillProps {
  icon: JSX.Element;
  label: string;
  onClick?: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
}

interface ClickToCopyPillProps {
  onClick: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
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
        "contain-layout flex items-center px-[3px] py-0 h-4 rounded-xs gap-[5px] [border-width:0.5px] border-solid border-label-tag-border",
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
      <Show when={props.isClickable}>
        <IconOpen
          size={10}
          class={cn(
            "text-label-tag-border transition-all duration-100",
            isHovered()
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[5px] w-0",
          )}
        />
      </Show>
    </div>
  );
};

const ActionPill: Component<ActionPillProps> = (props) => {
  const baseClass = cn(
    "flex items-center h-[18px] rounded-[1.5px] gap-[3px] px-[5px] py-px border-[0.5px] border-solid border-label-gray-border",
    props.shrink && "shrink-0 w-fit",
    props.asButton && "cursor-pointer bg-transparent",
    props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
  );

  const content = (
    <>
      {props.icon}
      <span
        class={cn(
          "text-black text-[12px] leading-4 font-medium tracking-[-0.04em]",
          props.shrink && "shrink-0 w-fit h-fit",
        )}
      >
        {props.label}
      </span>
    </>
  );

  return props.asButton ? (
    <button class={baseClass} onClick={props.onClick}>
      {content}
    </button>
  ) : (
    <div
      class={baseClass}
      role={props.onClick ? "button" : undefined}
      onClick={props.onClick}
    >
      {content}
    </div>
  );
};

const SuccessPill: Component<{ hasAgent?: boolean }> = (props) => (
  <div class="flex items-center h-[18px] rounded-[1.5px] gap-[3px] px-[5px] py-px bg-label-success-bg border-[0.5px] border-solid border-label-success-border">
    <IconCheckmark size={9} class="text-label-success-text shrink-0" />
    <span class="text-label-success-text text-[12px] leading-4 font-medium tracking-[-0.04em]">
      {props.hasAgent ? "Completed" : "Copied"}
    </span>
  </div>
);

const Arrow: Component<{ position: ArrowPosition; leftPx: number }> = (
  props,
) => (
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
        ? { "border-bottom": "8px solid white" }
        : { "border-top": "8px solid white" }),
      "z-index": "1",
    }}
  />
);

const CURSOR_ICON_URL =
  "https://workers.paper.design/file-assets/01K8D51Q7E2ESJTN18XN2MT96X/01KBGARFKP935S74CWGWFME8MN.svg";

const ClickToCopyPill: Component<ClickToCopyPillProps> = (props) => (
  <div
    class={cn(
      "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-[1.5px] gap-[3px]",
      props.asButton && "cursor-pointer",
      props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
    )}
    role={props.onClick ? "button" : undefined}
    onClick={props.onClick}
  >
    <div
      class="w-[8.5px] h-[9.5px] shrink-0 bg-cover bg-center"
      style={{ "background-image": `url(${CURSOR_ICON_URL})` }}
    />
    <div class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
      Click to copy
    </div>
  </div>
);

const BOTTOM_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(92.9% 0 0) 0%, oklab(100% 0 0) 100%)";
const RETURN_KEY_ICON_URL =
  "https://workers.paper.design/file-assets/01K8D51Q7E2ESJTN18XN2MT96X/01KBEJ7N5GQ0ZZ7K456R42AP4V.svg";

const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class="contain-layout shrink-0 flex flex-col items-start px-2 py-[5px] w-auto h-fit rounded-bl-[3px] rounded-br-[3px] self-stretch rounded-t-none"
    style={{ "background-image": BOTTOM_GRADIENT }}
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
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    let positionLeft = selectionCenterX - labelWidth / 2;
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
      Math.min(selectionCenterX - positionLeft, labelWidth - 12),
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
        class="fixed font-sans antialiased transition-opacity duration-300 ease-out"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": props.visible ? "auto" : "none",
          opacity: props.status === "fading" ? 0 : 1,
        }}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Arrow position={arrowPosition()} leftPx={computedPosition().arrowLeft} />

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0"
          style={{
            "box-shadow": "#00000033 0px 2px 3px",
          }}
        >
          <Show when={props.status === "copied" || props.status === "fading"}>
            <div class="flex items-center gap-[3px] pt-1 pb-1.5 px-1.5">
              <TagBadge
                tagName={tagDisplay()}
                isClickable={isTagClickable()}
                onClick={handleTagClick}
                onHoverChange={handleTagHoverChange}
                showMono
                shrink
              />
              <SuccessPill hasAgent={props.hasAgent} />
            </div>
          </Show>

          <Show when={props.status === "copying"}>
            <div class="flex items-center gap-[3px] react-grab-shimmer rounded-[3px] pt-1 pb-1.5 px-1.5">
              <TagBadge
                tagName={tagDisplay()}
                isClickable={isTagClickable()}
                onClick={handleTagClick}
                onHoverChange={handleTagHoverChange}
                showMono
                shrink
              />
              <ActionPill
                icon={<IconCursorSimple size={9} class="text-black shrink-0" />}
                label={props.statusText ?? "Grabbing…"}
              />
              <Show when={props.hasAgent && props.onAbort}>
                <button
                  class="flex items-center justify-center w-[18px] h-[18px] rounded-full cursor-pointer bg-black border-none transition-opacity hover:opacity-80"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    props.onAbort?.();
                  }}
                  title="Stop"
                >
                  <IconStop size={8} class="text-white" />
                </button>
              </Show>
            </div>
          </Show>

          <Show when={isNotProcessing() && !isIdle() && !props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 size-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 size-fit py-1 px-1.5">
                <ClickToCopyPill onClick={handleSubmit} shrink />
                <TagBadge
                  tagName={tagDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  showMono
                  shrink
                />
              </div>
            </div>
          </Show>

          <Show when={isNotProcessing() && isIdle() && !props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-fit h-fit">
                <ClickToCopyPill onClick={handleSubmit} shrink />
                <TagBadge
                  tagName={tagDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  showMono
                  shrink
                />
              </div>
              <BottomSection>
                <div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit">
                  <span class="text-[#767676] text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                    Press
                  </span>
                  <div
                    class="w-2.5 h-[9px] shrink-0 opacity-[0.41] bg-cover bg-center"
                    style={{ "background-image": `url(${RETURN_KEY_ICON_URL})` }}
                  />
                  <span class="text-[#767676] text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                    to edit
                  </span>
                </div>
              </BottomSection>
            </div>
          </Show>

          <Show when={isNotProcessing() && props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-fit h-fit">
                <ClickToCopyPill onClick={handleSubmit} dimmed shrink />
                <TagBadge
                  tagName={tagDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  showMono
                  shrink
                />
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-center w-full min-h-4">
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
                    placeholder="type to modify..."
                    rows={1}
                  />
                  <button
                    class="shrink-0 flex items-center gap-1 w-fit h-4 cursor-pointer bg-transparent border-none p-0 ml-1"
                    onClick={handleSubmit}
                  >
                    <div
                      class="w-2.5 h-[9px] shrink-0 bg-cover bg-center"
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
