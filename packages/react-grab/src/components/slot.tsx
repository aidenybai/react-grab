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
  // Number (or pre-formatted numeric string) whose digits roll
  // slot-machine style when the value changes. Non-digit characters
  // (`.`, `-`, ` `, etc.) are rendered as static segments between
  // digit columns so they preserve position without animating.
  children: string | number;
  // Override the auto-derived direction:
  //   1  → digits roll UP   (new digit enters from below)
  //   -1 → digits roll DOWN (new digit enters from above)
  //   0  → take the shortest mod-10 path
  // When omitted, sign(newValue - prevValue) drives direction so the
  // motion mirrors the value's actual change.
  direction?: 1 | -1 | 0;
  class?: string;
  style?: JSX.CSSProperties;
}

const DIGIT_REGEX = /^[0-9]$/;
const isDigit = (character: string) => DIGIT_REGEX.test(character);

const SLOT_FADE_MASK = `linear-gradient(to bottom, transparent 0%, black ${SLOT_FADE_HEIGHT_EM}em, black calc(100% - ${SLOT_FADE_HEIGHT_EM}em), transparent 100%)`;
const DIGITS_0_TO_9 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Modular shortest signed offset in [-5, 5] from `from` to `to` on a
// ring of 10 — used to pick the visually shortest digit roll when the
// caller doesn't impose a direction.
const ringOffset = (from: number, to: number): number => {
  let offset = (((to - from) % 10) + 10) % 10;
  if (offset > 5) offset -= 10;
  return offset;
};

// Signed digit step on the 0..9 ring honoring the caller's direction.
// direction > 0 → only forward (9 → 0 = +1, never -9), direction < 0 →
// only backward, direction === 0 → shortest path (mod-10 nearest).
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
  // `cumulativePosition` is unbounded: each digit change adds the
  // signed step (computeDigitDelta). The DOM renders digits 0..9 in
  // a stack — for each, translateY = -(offsetFromCumulative)*100% is
  // computed against the mod-10 position of `cumulativePosition`, so
  // only the active digit + its immediate neighbour are on-screen and
  // the rest sit clamped off the strip. CSS transitions on each
  // digit's transform produce the slot-spin animation.
  const [cumulativePosition, setCumulativePosition] = createSignal(0);

  // `on()` tracks the previous digit for us, so we never reach outside
  // a reactive context to peek at props. First fire (`previous ===
  // undefined`) seeds the cumulative to the initial digit without
  // animating; subsequent changes add the signed delta. Accumulating
  // history into a signal is the legitimate use of createEffect — the
  // value can't be expressed as a pure function of the current input
  // alone, so a memo isn't applicable.
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
      {/* Invisible "0" reserves layout width for the column so the
          absolutely-positioned digit children have a sized parent. */}
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

// Right-aligned digit columns: each entry's index = distance from the
// END of the string. Index 0 is the ones place, index 1 is the tens,
// etc. Combined with `flex-direction: row-reverse` in the renderer
// this gives every digit a stable position across digit-count
// transitions: incrementing 9 → 10 reuses index-0 (animates 9 → 0,
// the ones digit rolling down) and mounts a fresh column at index 1
// for the new "1" — instead of the naive left-aligned approach which
// would roll the existing 9 column all the way to 1 (a visible jolt)
// and stamp 0 on the right.
const collectRightAlignedDigits = (segments: readonly CharSegment[]): string[] => {
  const reversed: string[] = [];
  for (let position = segments.length - 1; position >= 0; position--) {
    const segment = segments[position];
    if (segment.kind === "digit") reversed.push(segment.value);
  }
  return reversed;
};

// Literals (sign, decimal point, separators) preserve their left-aligned
// order — they don't roll, just render. Only the prefix slice is
// rendered (anything before the first digit); literals AFTER the first
// digit are dropped because the slider use case only passes integer
// formatted strings into Slot today.
const collectPrefixLiterals = (segments: readonly CharSegment[]): string[] => {
  const out: string[] = [];
  for (const segment of segments) {
    if (segment.kind === "digit") break;
    out.push(segment.value);
  }
  return out;
};

// Intentionally narrow regex — keeps only digits, `.`, `-` so unit
// suffixes (`px`, `%`) and thousands separators are dropped. `+` signs
// are also dropped (parseFloat treats their absence as positive).
const parseNumeric = (raw: string | number): number => {
  if (typeof raw === "number") return raw;
  return Number.parseFloat(String(raw).replace(/[^0-9.-]/g, "")) || 0;
};

// Slot — calligraph's "slots" variant ported to SolidJS. Renders a
// numeric string with each digit in its own slot-machine column that
// spring-rolls to the new digit on change. Non-digit characters
// (decimal point, sign, spaces) sit static between columns.
//
// Direction is auto-derived from the sign of the change in numeric
// value, so incrementing rolls up and decrementing rolls down by
// default. Pass `direction` explicitly to override.
//
// Implementation note: CSS transitions on per-digit transform are used
// instead of a JS animation loop — the mod-10 ring math means only the
// active digit + its immediate neighbour ever animate, so the perf
// envelope is tiny and the browser handles spring easing via bezier.
export const Slot: Component<SlotProps> = (props) => {
  const text = createMemo(() => String(props.children ?? ""));
  const segments = createMemo(() => splitIntoSegments(text()));

  // Auto-direction: cached memo using on()'s previous-value tracking.
  // After a change, the memo holds the most recent direction until the
  // next change — exactly what consumers (SlotColumn) need.
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

  // Prefix literals (sign, leading non-digits) render left-aligned via
  // their natural order. Digit columns render right-aligned via
  // row-reverse so column-0 is always the ones place across
  // digit-count transitions.
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
        {/* Digit columns: rendered in reverse (ones-first) and visually
            reversed by row-reverse so the strip reads left-to-right but
            stable-keys by distance-from-right. */}
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
