import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
import {
  VIEWPORT_MARGIN_PX,
  ARROW_HEIGHT_PX,
  LABEL_GAP_PX,
  IDLE_TIMEOUT_MS,
} from "../../constants.js";
import { Arrow } from "./arrow.js";
import { TagBadge } from "./tag-badge.js";
import { ActionPill } from "./action-pill.js";
import { BottomSection } from "./bottom-section.js";

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let isTagCurrentlyHovered = false;
  let lastValidPosition: {
    left: number;
    top: number;
    arrowLeft: number;
  } | null = null;
  let lastElementIdentity: string | null = null;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);
  const [hadValidBounds, setHadValidBounds] = createSignal(false);

  const canInteract = () =>
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

  onMount(() => {
    measureContainer();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    resetIdleTimer();
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
  });

  createEffect(() => {
    const elementIdentity = `${props.tagName ?? ""}:${props.componentName ?? ""}`;
    if (elementIdentity !== lastElementIdentity) {
      lastElementIdentity = elementIdentity;
      resetIdleTimer();
    }
  });

  createEffect(() => {
    void props.tagName;
    void props.componentName;
    void props.elementsCount;
    void props.statusText;
    requestAnimationFrame(measureContainer);
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

  const computedPosition = () => {
    viewportVersion();
    const bounds = props.selectionBounds;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();
    const hasMeasurements = labelWidth > 0 && labelHeight > 0;
    const hasValidBounds = bounds && bounds.width > 0 && bounds.height > 0;

    if (!hasMeasurements || !hasValidBounds) {
      return lastValidPosition ?? { left: -9999, top: -9999, arrowLeft: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const selectionCenterX = bounds.x + bounds.width / 2;
    const cursorX = props.mouseX ?? selectionCenterX;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    let positionLeft = cursorX - labelWidth / 2;
    let positionTop = selectionBottom + ARROW_HEIGHT_PX + LABEL_GAP_PX;

    if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
      positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
    }
    if (positionLeft < VIEWPORT_MARGIN_PX) {
      positionLeft = VIEWPORT_MARGIN_PX;
    }

    const totalHeightNeeded = labelHeight + ARROW_HEIGHT_PX + LABEL_GAP_PX;
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

    const position = { left: positionLeft, top: positionTop, arrowLeft };
    lastValidPosition = position;
    setHadValidBounds(true);

    return position;
  };

  const tagDisplay = () => {
    if (props.elementsCount && props.elementsCount > 1) {
      return `${props.elementsCount} elements`;
    }
    if (props.componentName && props.tagName) {
      return `${props.componentName}.${props.tagName}`;
    }
    return props.componentName || props.tagName || "element";
  };

  const handleTagClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (props.filePath && props.onOpen) {
      props.onOpen();
    }
  };

  const isTagClickable = () => Boolean(props.filePath && props.onOpen);

  const stopPropagation = (event: Event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleSubmit = () => {
    props.onSubmit?.();
  };

  const shouldPersistDuringFade = () =>
    hadValidBounds() &&
    (props.status === "copied" || props.status === "fading");

  return (
    <Show
      when={
        props.visible !== false &&
        (props.selectionBounds || shouldPersistDuringFade())
      }
    >
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        class="fixed font-sans text-[13px] antialiased transition-opacity duration-300 ease-out filter-[drop-shadow(0px_0px_4px_#51515180)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": "none",
          opacity: props.status === "fading" ? 0 : 1,
        }}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Arrow
          position={arrowPosition()}
          leftPx={computedPosition().arrowLeft}
        />

        <Show when={props.status === "copying"}>
          <div class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0">
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
                <div class="contain-layout flex items-center px-0 py-px w-auto h-fit rounded-sm gap-[3px]">
                  <span class="text-[13px] leading-4 font-sans font-medium w-auto h-fit whitespace-normal text-[#71717a] animate-pulse tabular-nums">
                    {props.statusText ?? "Copying…"}
                  </span>
                </div>
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <span class="text-[#a1a1aa] text-[11px]">
                    {tagDisplay()}
                  </span>
                </div>
              </BottomSection>
            </div>
          </div>
        </Show>

        <Show when={props.status === "copied" || props.status === "fading"}>
          <div class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0">
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
                <span class="text-[13px] leading-4 font-sans font-medium text-[#22c55e]">
                  Copied!
                </span>
              </div>
              <BottomSection>
                <span class="text-[#a1a1aa] text-[11px]">
                  {tagDisplay()}
                </span>
              </BottomSection>
            </div>
          </div>
        </Show>

        <Show when={canInteract()}>
          <div class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0">
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
                <TagBadge
                  tagName={tagDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  shrink
                />
              </div>
              <BottomSection>
                <ActionPill
                  onClick={handleSubmit}
                  shrink
                  hasAgent={false}
                />
              </BottomSection>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};
