import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  type Component,
  type JSX,
} from "solid-js";
import {
  EDIT_SLIDER_SPRING_EASING,
  SLOT_FADE_HEIGHT_EM,
  SLOT_STAGGER_MS,
  SLOT_TRANSITION_MS,
} from "../constants.js";

interface SlotProps {
  children: string | number;
  // Override auto-derived direction: 1 rolls up, -1 rolls down, 0
  // takes the shortest mod-10 path. Omit to derive from value sign.
  direction?: 1 | -1 | 0;
  class?: string;
  style?: JSX.CSSProperties;
}

const DIGIT_REGEX = /^[0-9]$/;
const isDigit = (character: string) => DIGIT_REGEX.test(character);

const SLOT_FADE_MASK = `linear-gradient(to bottom, transparent 0%, black ${SLOT_FADE_HEIGHT_EM}em, black calc(100% - ${SLOT_FADE_HEIGHT_EM}em), transparent 100%)`;
const DIGITS_0_TO_9 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Shortest signed offset in [-5, 5] on the 0..9 ring.
const ringOffset = (from: number, to: number): number => {
  let offset = (((to - from) % 10) + 10) % 10;
  if (offset > 5) offset -= 10;
  return offset;
};

// Direction > 0 forces forward steps even when the new digit wraps
// (9 → 0 = +1 instead of -9), < 0 forces backward, 0 takes shortest.
const computeDigitDelta = (
  previousDigit: number,
  nextDigit: number,
  direction: 1 | -1 | 0,
): number => {
  if (previousDigit === nextDigit) return 0;
  if (direction > 0) {
    return nextDigit >= previousDigit
      ? nextDigit - previousDigit
      : 10 - previousDigit + nextDigit;
  }
  if (direction < 0) {
    return nextDigit <= previousDigit
      ? -(previousDigit - nextDigit)
      : -(previousDigit + (10 - nextDigit));
  }
  return ringOffset(previousDigit, nextDigit);
};

interface SlotColumnProps {
  digit: number;
  direction: 1 | -1 | 0;
  delayMs: number;
}

const SlotColumn: Component<SlotColumnProps> = (props) => {
  // Unbounded counter — adds each delta so `9 → 0` (going up) advances
  // past 10 instead of rolling backward. The mod-10 of this drives the
  // per-digit clamping in translateYPercent, so only the active digit +
  // its neighbour are on-screen and CSS transitions handle the roll.
  const [cumulativePosition, setCumulativePosition] = createSignal(0);

  // Accumulator: not derivable from props.digit alone, so createEffect
  // is the right primitive. `on()`'s previous arg avoids a closure-var
  // peek at props from setup-time.
  createEffect(
    on(
      () => props.digit,
      (nextDigit, previousDigit) => {
        if (previousDigit === undefined) {
          setCumulativePosition(nextDigit);
          return;
        }
        const delta = computeDigitDelta(previousDigit, nextDigit, props.direction);
        if (delta !== 0) setCumulativePosition((current) => current + delta);
      },
    ),
  );

  const currentMod = createMemo(() => ((cumulativePosition() % 10) + 10) % 10);

  return (
    <span class="relative inline-block" style={{ "vertical-align": "top" }}>
      {/* Sized parent for the absolutely-positioned digit children. */}
      <span aria-hidden="true" class="invisible inline-block whitespace-pre">
        0
      </span>
      <Index each={DIGITS_0_TO_9}>
        {(digit) => {
          const translateYPercent = createMemo(() => {
            const offset = ringOffset(currentMod(), digit());
            const clamped = Math.max(-1, Math.min(1, offset));
            return -clamped * 100;
          });
          return (
            <span
              aria-hidden="true"
              class="absolute top-0 left-1/2 inline-block whitespace-pre"
              style={{
                transform: `translateX(-50%) translateY(${translateYPercent()}%)`,
                transition: `transform ${SLOT_TRANSITION_MS}ms ${EDIT_SLIDER_SPRING_EASING} ${props.delayMs}ms`,
              }}
            >
              {digit()}
            </span>
          );
        }}
      </Index>
    </span>
  );
};

interface CharSegment {
  kind: "digit" | "literal";
  value: string;
}

const splitIntoSegments = (text: string): CharSegment[] => {
  const segments: CharSegment[] = [];
  for (const character of text) {
    segments.push({ kind: isDigit(character) ? "digit" : "literal", value: character });
  }
  return segments;
};

// Returned in right-to-left order — index 0 is the ones place. Combined
// with row-reverse in the renderer, each column keeps a stable identity
// across digit-count transitions (9 → 10 reuses index-0 as the ones
// digit and mounts a fresh column at index-1 for the new tens digit).
const collectRightAlignedDigits = (segments: readonly CharSegment[]): string[] => {
  const reversed: string[] = [];
  for (let position = segments.length - 1; position >= 0; position--) {
    const segment = segments[position];
    if (segment.kind === "digit") reversed.push(segment.value);
  }
  return reversed;
};

// Only the prefix (leading sign / literals before any digit) renders.
// In-body literals (e.g. `.` in "1.5") aren't handled — slider values
// pass integers into Slot today.
const collectPrefixLiterals = (segments: readonly CharSegment[]): string[] => {
  const out: string[] = [];
  for (const segment of segments) {
    if (segment.kind === "digit") break;
    out.push(segment.value);
  }
  return out;
};

const parseNumeric = (raw: string | number): number => {
  if (typeof raw === "number") return raw;
  return Number.parseFloat(String(raw).replace(/[^0-9.-]/g, "")) || 0;
};

// Slot — calligraph's "slots" variant ported to SolidJS. Per-digit CSS
// transitions on transform produce the slot-spin roll on value change.
export const Slot: Component<SlotProps> = (props) => {
  const text = createMemo(() => String(props.children ?? ""));
  const segments = createMemo(() => splitIntoSegments(text()));

  const autoDirection = createMemo<1 | -1 | 0>(
    on(
      () => parseNumeric(props.children),
      (current, previous) => {
        if (previous === undefined || current === previous) return 0;
        return current > previous ? 1 : -1;
      },
    ),
  );
  const direction = createMemo<1 | -1 | 0>(() => props.direction ?? autoDirection());

  const prefixLiterals = createMemo(() => collectPrefixLiterals(segments()));
  const rightAlignedDigits = createMemo(() => collectRightAlignedDigits(segments()));

  return (
    <span
      aria-label={text()}
      aria-live="polite"
      class={`relative inline-flex ${props.class ?? ""}`}
      style={props.style}
    >
      <span
        class="inline-flex"
        style={{
          "padding-top": `${SLOT_FADE_HEIGHT_EM}em`,
          "padding-bottom": `${SLOT_FADE_HEIGHT_EM}em`,
          "margin-top": `-${SLOT_FADE_HEIGHT_EM}em`,
          "margin-bottom": `-${SLOT_FADE_HEIGHT_EM}em`,
          "mask-image": SLOT_FADE_MASK,
          "-webkit-mask-image": SLOT_FADE_MASK,
        }}
      >
        <Index each={prefixLiterals()}>
          {(character) => (
            <span class="inline-block whitespace-pre" aria-hidden="true">
              {character()}
            </span>
          )}
        </Index>
        {/* row-reverse so the array's index 0 (ones place) renders
            rightmost while keeping a stable column identity. */}
        <span class="inline-flex" style={{ "flex-direction": "row-reverse" }}>
          <Index each={rightAlignedDigits()}>
            {(digit, distanceFromRight) => (
              <SlotColumn
                digit={Number(digit())}
                direction={direction()}
                delayMs={distanceFromRight * SLOT_STAGGER_MS}
              />
            )}
          </Index>
        </span>
      </span>
    </span>
  );
};
