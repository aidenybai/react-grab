import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import {
  EDIT_SLIDER_CLICK_THRESHOLD_PX,
  EDIT_SLIDER_HASH_MARK_COUNT,
  EDIT_SLIDER_RUBBER_DEAD_ZONE_PX,
  EDIT_SLIDER_RUBBER_MAX_PX,
  EDIT_SLIDER_RUBBER_SETTLE_MS,
  EDIT_SLIDER_RUBBER_SOFT_RANGE_PX,
  EDIT_SLIDER_SPRING_EASING,
} from "../../constants.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { Slot } from "../slot.js";
import { StepArrow } from "./step-arrow.js";

interface ValueStepperProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
  label?: string;
  onCommitValue?: (value: number) => void;
  onEditComplete?: () => void;
  // Fires on every drag-move so the parent's overlay-idle timer keeps
  // resetting even while the cursor is clamped past min/max and no
  // value-change events fire.
  onInteract?: () => void;
  emphasized?: boolean;
  tailwindLabel?: string | null;
}

const HASH_MARK_PERCENTS = Array.from(
  { length: EDIT_SLIDER_HASH_MARK_COUNT },
  (_, index) => ((index + 1) * 100) / (EDIT_SLIDER_HASH_MARK_COUNT + 1),
);

export const ValueStepper: Component<ValueStepperProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const [isHovered, setIsHovered] = createSignal(false);
  const [rubberStretchPx, setRubberStretchPx] = createSignal(0);
  const isEditing = () => draftText() !== null;
  let trackElement: HTMLDivElement | undefined;
  let valueTextElement: HTMLSpanElement | undefined;
  // `startedOnValueText` lets the value chip be both click-to-edit AND
  // a drag handle — pointer-down records the flag, release branches on
  // it.
  let dragState:
    | { startX: number; isDragging: boolean; startedOnValueText: boolean }
    | null = null;

  const valueClass = "text-[12px] leading-4 font-medium tabular-nums";
  const labelClass = "text-[13px] leading-4 font-medium";

  const fillPercent = () => {
    const span = props.max - props.min;
    if (span <= 0) return 0;
    const clamped = Math.max(props.min, Math.min(props.max, props.value));
    return ((clamped - props.min) / span) * 100;
  };

  const startEditing = () => {
    if (!props.onCommitValue) return;
    setDraftText(formatDisplayValue(props.value));
  };

  const isDragSupported = () => Boolean(props.onCommitValue);

  // Absolute-position drag: cursor x maps to a position inside the
  // track, which maps to a value in [min, max]. Guarantees the fill
  // and handle move 1:1 with the cursor — the only way the slider
  // can read as "linear" regardless of the property's range.
  const positionToValue = (clientX: number): number => {
    if (!trackElement) return props.value;
    const rect = trackElement.getBoundingClientRect();
    if (rect.width <= 0) return props.value;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return props.min + ratio * (props.max - props.min);
  };

  const commitDrag = (clientX: number) => {
    props.onCommitValue?.(positionToValue(clientX));
  };

  // Past DEAD_ZONE_PX overflow the track pulls toward the cursor with
  // sqrt-decay, capped at MAX_PX. signedOvershoot is negative past the
  // left edge, positive past the right.
  const computeRubberStretch = (clientX: number, trackRect: DOMRect): number => {
    const signedOvershoot =
      Math.max(0, clientX - trackRect.right) -
      Math.max(0, trackRect.left - clientX);
    const past = Math.max(
      0,
      Math.abs(signedOvershoot) - EDIT_SLIDER_RUBBER_DEAD_ZONE_PX,
    );
    const decay = Math.sqrt(Math.min(past / EDIT_SLIDER_RUBBER_SOFT_RANGE_PX, 1));
    return Math.sign(signedOvershoot) * EDIT_SLIDER_RUBBER_MAX_PX * decay;
  };

  const handleTrackPointerDown = (event: PointerEvent) => {
    if (!isDragSupported() || isEditing()) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    const valueChip = valueTextElement;
    const startedOnValueText =
      valueChip !== undefined &&
      event.target instanceof Node &&
      valueChip.contains(event.target);
    dragState = { startX: event.clientX, isDragging: false, startedOnValueText };
    props.onInteract?.();
  };

  const handleTrackPointerMove = (event: PointerEvent) => {
    if (!dragState || !trackElement) return;
    const deltaX = event.clientX - dragState.startX;
    if (!dragState.isDragging && Math.abs(deltaX) < EDIT_SLIDER_CLICK_THRESHOLD_PX) return;
    dragState.isDragging = true;
    props.onInteract?.();
    commitDrag(event.clientX);
    setRubberStretchPx(
      computeRubberStretch(event.clientX, trackElement.getBoundingClientRect()),
    );
  };

  const handleTrackPointerUp = (event: PointerEvent) => {
    if (!dragState) return;
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    if (!dragState.isDragging) {
      if (dragState.startedOnValueText) startEditing();
      else commitDrag(dragState.startX);
    }
    dragState = null;
    setRubberStretchPx(0);
  };

  // Shared release path for pointercancel + lostpointercapture. The
  // latter fires when the browser revokes capture for any reason (mouse
  // leaves the window, gesture stolen, capturing element unmounted) —
  // without this the drag state would leak and the rubber-band stretch
  // would stay at its last value forever.
  const releaseDrag = (event: PointerEvent) => {
    if (!dragState) return;
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    dragState = null;
    setRubberStretchPx(0);
  };

  // Defensive: alt-tab / focus loss / system gesture can land the
  // browser in a state where neither pointerup nor pointercancel ever
  // fires. Drop the drag state on blur so the stretch can't stay stuck.
  onMount(() => {
    const handleBlur = () => {
      dragState = null;
      setRubberStretchPx(0);
    };
    window.addEventListener("blur", handleBlur);
    onCleanup(() => window.removeEventListener("blur", handleBlur));
  });

  const isActiveSlider = () => isHovered() || Boolean(props.activeKey) || dragState !== null;

  const commit = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    const parsed = Number.parseFloat(text);
    if (Number.isFinite(parsed)) props.onCommitValue?.(parsed);
    props.onEditComplete?.();
  };

  const cancel = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleEditKeyDown = (event: KeyboardEvent) => {
    // stopImmediatePropagation prevents the panel's window-level handler
    // from also reacting to Enter/Esc while the inline editor owns input.
    event.stopImmediatePropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
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
      transform: stretch === 0 ? "translateX(0)" : `translateX(${stretch}px)`,
      // Mid-drag: stretch tracks the pointer with no smoothing. On
      // release stretch resets to 0 and this transition produces the
      // spring-back.
      transition: dragState !== null
        ? "none"
        : `transform ${EDIT_SLIDER_RUBBER_SETTLE_MS}ms ${EDIT_SLIDER_SPRING_EASING}`,
    };
  };

  return (
    <div class="flex items-center gap-1 w-full px-1">
      <div
        ref={trackElement}
        class="relative flex-1 h-[20px] flex items-center overflow-hidden rounded-[6px]"
        style={trackStyle()}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={releaseDrag}
        onLostPointerCapture={releaseDrag}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          aria-hidden="true"
          class="absolute inset-y-0 left-0 bg-[var(--rg-surface-active)] pointer-events-none"
          style={{ width: `${fillPercent()}%` }}
        />
        <Show when={!props.emphasized}>
          <div aria-hidden="true" class="absolute inset-0 pointer-events-none">
            {HASH_MARK_PERCENTS.map((percent) => (
              <div
                class="absolute top-1/2 w-px h-[8px] rounded-[1px] bg-[var(--rg-text-secondary)]"
                style={{
                  left: `${percent}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: isActiveSlider() ? 0.4 : 0,
                  transition: "opacity 200ms ease",
                }}
              />
            ))}
          </div>
        </Show>
        <div
          aria-hidden="true"
          class="absolute top-[2px] bottom-[2px] w-[2px] rounded-[1px] bg-[var(--rg-text-primary)] pointer-events-none"
          style={{
            left: `calc(${fillPercent()}% - 1px)`,
            opacity: props.activeKey ? 0.9 : 0.35,
            transition: "opacity 120ms ease",
          }}
        />
        <div class="relative z-10 flex items-center justify-between w-full px-2 pointer-events-none">
          <Show when={props.label} keyed>
            {(text) => (
              <span class={`${labelClass} text-[var(--rg-text-primary)] truncate min-w-0`}>
                {text}
              </span>
            )}
          </Show>
          <Show
            when={isEditing()}
            fallback={
              <span
                class="ml-auto flex items-baseline gap-1 pointer-events-auto"
                data-react-grab-value={`${formatDisplayValue(props.value)}${props.unit}`}
              >
                <span
                  ref={valueTextElement}
                  class={`${valueClass} text-[var(--rg-text-primary)]`}
                  style={{
                    cursor: props.onCommitValue ? "text" : "default",
                  }}
                >
                  <Slot>{formatDisplayValue(props.value)}</Slot>
                  <span class="text-[var(--rg-text-secondary)] ml-px">{props.unit}</span>
                </span>
                <Show when={props.tailwindLabel} keyed>
                  {(label) => (
                    <span
                      aria-hidden="true"
                      class="text-[10px] leading-4 font-mono text-[var(--rg-text-secondary)] tabular-nums"
                    >
                      · {label}
                    </span>
                  )}
                </Show>
              </span>
            }
          >
          <input
            ref={(element) => {
              queueMicrotask(() => {
                element.focus();
                element.select();
              });
            }}
            data-react-grab-ignore-events
            data-react-grab-input
            type="text"
            inputmode="decimal"
            aria-label="Edit value"
            class={`${valueClass} bg-transparent border-none outline-none text-[var(--rg-text-primary)] p-0 m-0 text-right pointer-events-auto ml-auto`}
            style={{
              "field-sizing": "content",
              "min-width": "16px",
              "max-width": props.emphasized ? "120px" : "60px",
            }}
            value={draftText() ?? ""}
            onInput={(event) => setDraftText(event.currentTarget.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commit}
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
