import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  onCleanup,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import { SLOT_STAGGER_MS, SLOT_TRANSITION_MS } from "../constants.js";
import { createSlotRenderSegments } from "../utils/create-slot-render-segments.js";

interface SlotProps {
  children: string | number;
  direction?: 1 | -1 | 0;
  class?: string;
  style?: JSX.CSSProperties;
}

const approximateNumericValue = (raw: string | number): number => {
  if (typeof raw === "number") return raw;
  return Number.parseFloat(String(raw).replace(/[^0-9.-]/g, "")) || 0;
};

interface DigitColumnProps {
  digit: number;
  direction: 1 | -1 | 0;
  delayMs: number;
}

interface ExitingDigit {
  digit: number;
  direction: 1 | -1 | 0;
}

const DigitColumn: Component<DigitColumnProps> = (props) => {
  let enterCellRef: HTMLSpanElement | undefined;
  const [exitingDigit, setExitingDigit] = createSignal<ExitingDigit | null>(null);
  let exitTimerId: ReturnType<typeof setTimeout> | null = null;

  // On every digit change: spawn an exit element for the previous
  // digit and restart the enter animation on the current cell. Rapid
  // changes replace the in-flight exit so only one exit element is
  // ever alive — sweep changes blur into one trail instead of
  // stacking N exit elements.
  createEffect(
    on(
      () => props.digit,
      (nextDigit, previousDigit) => {
        if (previousDigit === undefined || nextDigit === previousDigit) return;
        if (enterCellRef) {
          enterCellRef.classList.remove("rg-slot-enter");
          // Force reflow so the re-added class restarts the CSS
          // animation. Without this, the browser collapses the
          // remove+add into a no-op.
          void enterCellRef.offsetWidth;
          enterCellRef.classList.add("rg-slot-enter");
        }
        setExitingDigit({ digit: previousDigit, direction: props.direction });
        if (exitTimerId !== null) clearTimeout(exitTimerId);
        exitTimerId = setTimeout(() => setExitingDigit(null), SLOT_TRANSITION_MS);
      },
      { defer: true },
    ),
  );
  onCleanup(() => {
    if (exitTimerId !== null) clearTimeout(exitTimerId);
  });

  const cellStyle = (): JSX.CSSProperties => ({
    "animation-delay": `${props.delayMs}ms`,
  });

  // Digit cells are aria-hidden so screen readers don't double-read
  // ("twelve fourteen sixteen" stream). The parent Slot owns the
  // accessible name via aria-label.
  return (
    <span class="rg-slot-column" aria-hidden="true">
      <span class="rg-slot-sizer">0</span>
      <span
        ref={enterCellRef}
        class="rg-slot-cell"
        data-dir={String(props.direction)}
        style={cellStyle()}
      >
        {props.digit}
      </span>
      <Show when={exitingDigit()} keyed>
        {(exitState) => (
          <span
            class="rg-slot-cell rg-slot-exit"
            data-dir={String(exitState.direction)}
            style={cellStyle()}
          >
            {exitState.digit}
          </span>
        )}
      </Show>
    </span>
  );
};

export const Slot: Component<SlotProps> = (props) => {
  const text = createMemo(() => String(props.children ?? ""));
  const renderSegments = createMemo(() => createSlotRenderSegments(text()));

  const autoDirection = createMemo<1 | -1 | 0>(
    on(
      () => approximateNumericValue(props.children),
      (current, previous) => {
        if (previous === undefined || current === previous) return 0;
        return current > previous ? 1 : -1;
      },
    ),
  );
  const direction = createMemo<1 | -1 | 0>(() => props.direction ?? autoDirection());

  return (
    <span
      aria-label={text()}
      // Intentionally NOT aria-live. A slider drag commits at 60Hz
      // and flooding a live region at that rate produces unusable
      // SR verbosity. The parent (ValueStepper / value chip) owns
      // any debounced live announcement separately.
      class={`inline-flex ${props.class ?? ""}`}
      // SLOT_TRANSITION_MS drives both the JS exit-cell lifetime
      // (setTimeout) and the CSS animation duration via this custom
      // property — keeps the constant as the single source of truth.
      style={{
        ...props.style,
        "--rg-slot-dur": `${SLOT_TRANSITION_MS}ms`,
      }}
    >
      <Index each={renderSegments().prefixLiterals}>
        {(character) => (
          <span class="inline-block whitespace-pre" aria-hidden="true">
            {character()}
          </span>
        )}
      </Index>
      <span class="inline-flex" style={{ "flex-direction": "row-reverse" }}>
        <Index each={renderSegments().rightAlignedSegments}>
          {(segment) => (
            <Show
              when={segment().kind === "digit"}
              fallback={
                <span class="inline-block whitespace-pre" aria-hidden="true">
                  {segment().value}
                </span>
              }
            >
              <DigitColumn
                digit={Number(segment().value)}
                direction={direction()}
                delayMs={segment().digitDistanceFromRight * SLOT_STAGGER_MS}
              />
            </Show>
          )}
        </Index>
      </span>
    </span>
  );
};
