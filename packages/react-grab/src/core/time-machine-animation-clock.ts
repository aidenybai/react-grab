// Rewinding state without rewinding motion looks broken: spinners keep
// spinning, remounted elements replay their entry animations, and CSS
// transitions tween between scrub steps. This module stops the page's
// animation clock while the time machine is rewound. Instead of snapshotting
// animation times on every commit (document.getAnimations() forces a style
// flush, too expensive per commit), the clock captures each animation's
// currentTime once — at the moment of the first rewind — and derives its time
// at any history entry arithmetically from the entry's timestamp:
// entryTime = capturedTime - (captureWallClock - entryWallClock).
import { TIME_MACHINE_ANIMATION_SETTLE_SWEEP_FRAMES } from "../constants.js";
import { createStyleElement } from "../utils/create-style-element.js";
import { isShadowAnimation } from "../utils/freeze-animations.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";

// Newborn CSS animations (from travel-remounted elements) must be born paused
// or their first frames flash before the settle sweep can seek them; killing
// transitions makes scrub steps snap instantly instead of tweening.
const ANIMATION_CLOCK_STYLES = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;

interface FrozenAnimationRecord {
  animation: Animation;
  baseTimeMs: number;
  didPause: boolean;
}

let clockFrozenAtMs: number | null = null;
let clockTargetMs = 0;
let frozenAnimationRecords: FrozenAnimationRecord[] = [];
let recordByAnimation = new Map<Animation, FrozenAnimationRecord>();
let clockStyleElement: HTMLStyleElement | null = null;
let settleFramesRemaining = 0;
let settleFrameId: number | null = null;

const readCurrentTimeMs = (animation: Animation): number | null => {
  const currentTime: unknown = animation.currentTime;
  return typeof currentTime === "number" ? currentTime : null;
};

const readEndTimeMs = (animation: Animation): number => {
  try {
    const endTime: unknown = animation.effect?.getComputedTiming().endTime;
    return typeof endTime === "number" ? endTime : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

// Finite animations are one-shot transitions (enter/exit/hover tweens); an
// entry recorded at the commit that TRIGGERED such a transition would freeze
// it mid-flight — e.g. a text swap showing both the old and new text at
// once, which reads as garbage. Their truthful "between moments" look is the
// settled end pose, so finite animations park there while rewound. Only
// infinite (looping) animations get wall-clock seeking, which is what makes
// spinners visibly turn backward as you scrub.
const seekAnimation = (record: FrozenAnimationRecord): void => {
  const frozenAtMs = clockFrozenAtMs;
  if (frozenAtMs === null) return;
  const endTimeMs = readEndTimeMs(record.animation);
  const elapsedSinceEntryMs = frozenAtMs - clockTargetMs;
  try {
    record.animation.currentTime = Number.isFinite(endTimeMs)
      ? endTimeMs
      : Math.max(0, record.baseTimeMs - elapsedSinceEntryMs);
  } catch {
    // The animation was cancelled or its target detached mid-rewind.
  }
};

const captureAnimation = (animation: Animation): void => {
  const currentTimeMs = readCurrentTimeMs(animation);
  if (currentTimeMs === null) return;
  const didPause = animation.playState === "running";
  if (didPause) {
    try {
      animation.pause();
    } catch {
      return;
    }
  }
  const record: FrozenAnimationRecord = { animation, baseTimeMs: currentTimeMs, didPause };
  frozenAnimationRecords.push(record);
  recordByAnimation.set(animation, record);
  seekAnimation(record);
};

// An animation first seen while rewound comes from a travel-remounted
// element, which at the rewound moment had long settled — so its entry
// animation is held at its final pose instead of replaying. Loops have no
// final pose; any frame reads as "frozen in time".
const captureNewbornAnimation = (animation: Animation): void => {
  if (animation.playState === "running") {
    try {
      animation.pause();
    } catch {
      return;
    }
  }
  const endTimeMs = readEndTimeMs(animation);
  const restingTimeMs = Number.isFinite(endTimeMs) ? endTimeMs : 0;
  try {
    animation.currentTime = restingTimeMs;
  } catch {
    return;
  }
  const record: FrozenAnimationRecord = {
    animation,
    baseTimeMs: restingTimeMs,
    didPause: true,
  };
  frozenAnimationRecords.push(record);
  recordByAnimation.set(animation, record);
};

const sweepAnimations = (): void => {
  for (const animation of document.getAnimations()) {
    if (isShadowAnimation(animation)) continue;
    if (recordByAnimation.has(animation)) continue;
    captureNewbornAnimation(animation);
  }
};

const runSettleSweep = (): void => {
  settleFrameId = null;
  if (clockFrozenAtMs === null || settleFramesRemaining === 0) return;
  settleFramesRemaining -= 1;
  sweepAnimations();
  if (settleFramesRemaining > 0) {
    settleFrameId = nativeRequestAnimationFrame(runSettleSweep);
  }
};

const scheduleSettleSweep = (): void => {
  settleFramesRemaining = TIME_MACHINE_ANIMATION_SETTLE_SWEEP_FRAMES;
  if (settleFrameId === null) {
    settleFrameId = nativeRequestAnimationFrame(runSettleSweep);
  }
};

const freezeClock = (): void => {
  if (clockFrozenAtMs !== null) return;
  clockFrozenAtMs = Date.now();
  // READ before WRITE: getAnimations() flushes styles, so it runs before the
  // stylesheet injection to avoid a second full-document recalc.
  const animations = document.getAnimations();
  clockStyleElement = createStyleElement("data-react-grab-time-machine-clock-freeze", "");
  clockStyleElement.textContent = ANIMATION_CLOCK_STYLES;
  for (const animation of animations) {
    if (isShadowAnimation(animation)) continue;
    captureAnimation(animation);
  }
};

// Points the frozen clock at a history entry's wall-clock moment. Idempotent
// per scrub step; freezes the clock on the first rewound step.
export const syncAnimationClock = (entryTimestampMs: number): void => {
  freezeClock();
  clockTargetMs = entryTimestampMs;
  for (const record of frozenAnimationRecords) {
    seekAnimation(record);
  }
  scheduleSettleSweep();
};

// Returning to the present (or closing the panel) restores every animation to
// the time it was captured at and resumes the ones the clock paused — a
// seamless continuation, unlike finish(), because nothing moved while frozen.
export const releaseAnimationClock = (): void => {
  if (clockFrozenAtMs === null) return;
  clockFrozenAtMs = null;
  settleFramesRemaining = 0;
  if (settleFrameId !== null) {
    nativeCancelAnimationFrame(settleFrameId);
    settleFrameId = null;
  }
  // The pause stylesheet goes first so play() below isn't fighting the
  // universal animation-play-state rule; the transition:none rule also masks
  // any style snap from the restored seeks.
  clockStyleElement?.remove();
  clockStyleElement = null;
  for (const record of frozenAnimationRecords) {
    try {
      record.animation.currentTime = record.baseTimeMs;
      if (record.didPause) {
        record.animation.play();
      }
    } catch {
      // The animation was cancelled or its target detached mid-rewind.
    }
  }
  frozenAnimationRecords = [];
  recordByAnimation = new Map();
};
