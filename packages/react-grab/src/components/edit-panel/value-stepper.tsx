import { createSignal, Index, onCleanup, onMount, Show, type Component, type JSX } from "solid-js";
import {
  EDIT_SLIDER_CLICK_THRESHOLD_PX,
  EDIT_SLIDER_HASH_MARK_COUNT,
  EDIT_SLIDER_RUBBER_DEAD_ZONE_PX,
  EDIT_SLIDER_RUBBER_MAX_PX,
  EDIT_SLIDER_RUBBER_SETTLE_MS,
  EDIT_SLIDER_RUBBER_SOFT_RANGE_PX,
  EDIT_SLIDER_SPRING_EASING,
  EDIT_COMPACT_SLIDER_MIN_WIDTH_PX,
} from "../../constants.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { isKeyboardEventComposing } from "../../utils/is-keyboard-event-composing.js";
import { Slot } from "../slot.js";
import { Input } from "../ui/input.js";
import { EDIT_LABEL_CLASS, EDIT_VALUE_CLASS } from "./constants.js";
import { StepArrow } from "./step-arrow.js";

interface ValueStepperProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
  label?: string;
  onCommitValue?: (value: number, source: "keyboard" | "pointer") => void;
  onEditComplete?: () => void;
  onInvalidCommit?: () => void;
  onInteract?: () => void;
  emphasized?: boolean;
  tailwindLabel?: string | null;
}

const HASH_MARK_PERCENTS = Array.from(
  { length: EDIT_SLIDER_HASH_MARK_COUNT },
  (_, index) => ((index + 1) * 100) / (EDIT_SLIDER_HASH_MARK_COUNT + 1),
);

const INLINE_VALUE_PATTERN = /^(-?(?:\d+\.?\d*|\.\d+))\s*([a-zA-Z%]*)$/;

export const ValueStepper: Component<ValueStepperProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const [rubberStretchPx, setRubberStretchPx] = createSignal(0);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isHovered, setIsHovered] = createSignal(false);
  const isEditing = () => draftText() !== null;
  let valueTextElement: HTMLSpanElement | undefined;
  let dragState: {
    startX: number;
    isDragging: boolean;
    startedOnValueText: boolean;
    trackRect: DOMRect;
  } | null = null;

  const fillPercent = () => {
    const valueRange = props.max - props.min;
    if (valueRange <= 0) return 0;
    const clamped = Math.max(props.min, Math.min(props.max, props.value));
    return ((clamped - props.min) / valueRange) * 100;
  };

  const startEditing = () => {
    if (!props.onCommitValue) return;
    setDraftText(formatDisplayValue(props.value));
  };

  const isDragSupported = () => Boolean(props.onCommitValue);

  const positionToValue = (clientX: number, rect: DOMRect): number => {
    if (rect.width <= 0) return props.value;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return props.min + ratio * (props.max - props.min);
  };

  const commitDrag = (clientX: number, rect: DOMRect) => {
    props.onCommitValue?.(positionToValue(clientX, rect), "pointer");
  };

  const clearDragState = (): void => {
    dragState = null;
    setIsDragging(false);
    setRubberStretchPx(0);
  };

  const computeRubberStretch = (clientX: number, trackRect: DOMRect): number => {
    const signedOvershoot =
      Math.max(0, clientX - trackRect.right) - Math.max(0, trackRect.left - clientX);
    const past = Math.max(0, Math.abs(signedOvershoot) - EDIT_SLIDER_RUBBER_DEAD_ZONE_PX);
    const decay = Math.sqrt(Math.min(past / EDIT_SLIDER_RUBBER_SOFT_RANGE_PX, 1));
    return Math.sign(signedOvershoot) * EDIT_SLIDER_RUBBER_MAX_PX * decay;
  };

  const handleTrackPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (!isDragSupported() || isEditing()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const valueChip = valueTextElement;
    const startedOnValueText =
      valueChip !== undefined && event.target instanceof Node && valueChip.contains(event.target);
    dragState = {
      startX: event.clientX,
      isDragging: false,
      startedOnValueText,
      trackRect: event.currentTarget.getBoundingClientRect(),
    };
    setIsDragging(true);
    props.onInteract?.();
  };

  const handleTrackPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (!dragState) return;
    const deltaX = event.clientX - dragState.startX;
    if (!dragState.isDragging && Math.abs(deltaX) < EDIT_SLIDER_CLICK_THRESHOLD_PX) return;
    dragState.isDragging = true;
    props.onInteract?.();
    commitDrag(event.clientX, dragState.trackRect);
    setRubberStretchPx(computeRubberStretch(event.clientX, dragState.trackRect));
  };

  const handleTrackPointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    if (!dragState) return;
    if (!dragState.isDragging) {
      if (dragState.startedOnValueText) startEditing();
      else commitDrag(dragState.startX, dragState.trackRect);
    }
    clearDragState();
  };

  const releaseDrag: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    if (dragState) clearDragState();
  };

  // Defensive: alt-tab / focus loss / system gesture can land the
  // browser in a state where neither pointerup nor pointercancel ever
  // fires. Drop the drag state on blur so the stretch can't stay stuck.
  onMount(() => {
    const handleBlur = () => {
      clearDragState();
      setIsHovered(false);
    };
    window.addEventListener("blur", handleBlur);
    onCleanup(() => window.removeEventListener("blur", handleBlur));
  });

  const isAdjustingSlider = () => Boolean(props.activeKey) || isDragging() || isHovered();

  // Match "<number><optional-unit>" — rejects pasted `calc(...)`,
  // `++5`, free text. Normalizes single comma decimals (de-DE locale)
  // to dots. Rejects unit mismatches (`1.5rem` typed into a `px` row
  // would silently commit 1.5px without this guard). Accepts trailing
  // dot (`5.`) for users mid-typing a decimal — `parseFloat("5.") = 5`.
  const commitDraftText = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    const valueMatch = text
      .trim()
      .replace(/(\d),(\d)/g, "$1.$2")
      .match(INLINE_VALUE_PATTERN);
    if (!valueMatch) {
      props.onInvalidCommit?.();
      props.onEditComplete?.();
      return;
    }
    const typedUnit = valueMatch[2].toLowerCase();
    if (typedUnit && typedUnit !== props.unit) {
      props.onInvalidCommit?.();
      props.onEditComplete?.();
      return;
    }
    const parsed = Number.parseFloat(valueMatch[1]);
    if (Number.isFinite(parsed)) {
      props.onCommitValue?.(parsed, "keyboard");
    } else {
      props.onInvalidCommit?.();
    }
    props.onEditComplete?.();
  };

  const cancel = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleEditKeyDown = (event: KeyboardEvent) => {
    // IME composition: an Enter that confirms a Hiragana/Hangul
    // candidate has `isComposing=true` mid-composition and
    // `keyCode===229` on the commit tick (Chromium). Bail in both
    // cases so we don't fire commitDraftText() while the user is still picking
    // an IME candidate.
    if (isKeyboardEventComposing(event)) return;
    event.stopImmediatePropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraftText();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const trackStyle = (): JSX.CSSProperties => {
    const stretch = rubberStretchPx();
    return {
      cursor: isDragSupported() && !isEditing() ? "ew-resize" : "default",
      "touch-action": isDragSupported() ? "none" : "auto",
      "user-select": "none",
      "-webkit-user-select": "none",
      "min-width": props.emphasized ? `${EDIT_COMPACT_SLIDER_MIN_WIDTH_PX}px` : undefined,
      transform: stretch === 0 ? "translateX(0)" : `translateX(${stretch}px)`,
      transition: isDragging()
        ? "none"
        : `transform ${EDIT_SLIDER_RUBBER_SETTLE_MS}ms ${EDIT_SLIDER_SPRING_EASING}`,
    };
  };

  return (
    <div class="flex items-center gap-1 w-full px-1">
      <div
        role="slider"
        aria-label={props.label ?? "Value"}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={props.value}
        aria-valuetext={`${formatDisplayValue(props.value)}${props.unit}`}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        tabIndex={-1}
        class="relative flex-1 h-[20px] flex items-center overflow-hidden rounded-[6px]"
        style={trackStyle()}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={releaseDrag}
        onLostPointerCapture={releaseDrag}
      >
        <Show when={props.emphasized}>
          <div
            data-react-grab-slider-base
            aria-hidden="true"
            class="absolute inset-y-0 left-0 right-0 rounded-[6px] bg-[var(--rg-surface-active)] pointer-events-none"
            style={{
              opacity: isEditing() ? 0 : 0.55,
            }}
          />
        </Show>
        <div
          data-react-grab-slider-fill
          aria-hidden="true"
          class="absolute inset-y-0 left-0 bg-[var(--rg-surface-active)] pointer-events-none"
          style={{
            width: `${fillPercent()}%`,
            opacity: isEditing() ? 0 : 1,
          }}
        />
        <div aria-hidden="true" class="absolute inset-0 pointer-events-none">
          <Index each={HASH_MARK_PERCENTS}>
            {(percent) => (
              <div
                data-react-grab-slider-hash-mark
                class="absolute top-1/2 w-px h-[8px] rounded-[1px] bg-[var(--rg-text-secondary)]"
                style={{
                  left: `${percent()}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: isAdjustingSlider() ? 0.4 : 0,
                  transition: "opacity 200ms ease",
                }}
              />
            )}
          </Index>
        </div>
        <div
          data-react-grab-slider-handle
          aria-hidden="true"
          class="absolute top-[2px] bottom-[2px] w-[2px] rounded-[1px] bg-[var(--rg-text-primary)] pointer-events-none"
          style={{
            left: `calc(${fillPercent()}% - 1px)`,
            opacity: props.activeKey ? 0.9 : isDragging() || isHovered() ? 0.35 : 0,
            transition: "opacity 120ms ease",
          }}
        />
        <div class="relative z-10 flex items-center justify-between w-full px-2 pointer-events-none">
          <Show when={props.label}>
            {(text) => (
              <span
                class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}
                textContent={text()}
              />
            )}
          </Show>
          <Show
            when={isEditing()}
            fallback={
              <span
                ref={valueTextElement}
                class="ml-auto flex items-center gap-1 pointer-events-auto"
                data-react-grab-value={`${formatDisplayValue(props.value)}${props.unit}`}
                style={{
                  cursor: props.onCommitValue ? "text" : "default",
                }}
              >
                <Show when={props.tailwindLabel}>
                  {(label) => (
                    <span
                      data-react-grab-tailwind-label
                      aria-hidden="true"
                      class="text-[10px] leading-4 text-[var(--rg-text-secondary)] tabular-nums"
                      textContent={label()}
                    />
                  )}
                </Show>
                <span
                  data-react-grab-value-text
                  class={`${EDIT_VALUE_CLASS} text-[var(--rg-text-primary)]`}
                >
                  <Slot>{formatDisplayValue(props.value)}</Slot>
                  <span
                    class="text-[9px] text-[var(--rg-text-secondary)] ml-px"
                    textContent={props.unit}
                  />
                </span>
              </span>
            }
          >
            <Input
              autoFocusSelect
              inputmode="decimal"
              aria-label="Style value"
              class={`${EDIT_VALUE_CLASS} text-right pointer-events-auto ml-auto`}
              style={{
                "field-sizing": "content",
                "min-width": "16px",
                "max-width": props.emphasized ? "120px" : "60px",
              }}
              value={draftText() ?? ""}
              onInput={(event) => setDraftText(event.currentTarget.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={commitDraftText}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          </Show>
        </div>
      </div>
      <Show when={props.emphasized}>
        <StepArrow
          direction="left"
          active={props.activeKey === "left"}
          onPointerDown={() => props.onStep(-1)}
        />
        <StepArrow
          direction="right"
          active={props.activeKey === "right"}
          onPointerDown={() => props.onStep(1)}
        />
      </Show>
    </div>
  );
};
