import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import {
  EDIT_STEP_REPEAT_INITIAL_DELAY_MS,
  EDIT_STEP_REPEAT_INTERVAL_MS,
} from "../../constants.js";

type ArrowKey = "ArrowLeft" | "ArrowRight";
type Direction = 1 | -1;

const getDirectionForKey = (key: ArrowKey): Direction => (key === "ArrowLeft" ? -1 : 1);

interface StepControllerOptions {
  step: (direction: Direction, shift: boolean, isRepeat: boolean) => void;
  isShiftHeld: Accessor<boolean>;
}

export interface StepController {
  readonly heldDirection: Accessor<-1 | 0 | 1>;
  pressArrow: (key: ArrowKey, isRepeat: boolean, shiftKey: boolean) => void;
  releaseKey: (key: string) => void;
  cancelRepeat: () => void;
}

export const createStepController = (options: StepControllerOptions): StepController => {
  const [heldDirection, setHeldDirection] = createSignal<-1 | 0 | 1>(0);
  let pressedArrowKey: ArrowKey | null = null;
  let repeatInitialDelayId: ReturnType<typeof setTimeout> | null = null;
  let repeatIntervalId: ReturnType<typeof setInterval> | null = null;

  const clearRepeatTimers = () => {
    if (repeatInitialDelayId !== null) clearTimeout(repeatInitialDelayId);
    if (repeatIntervalId !== null) clearInterval(repeatIntervalId);
    repeatInitialDelayId = null;
    repeatIntervalId = null;
    pressedArrowKey = null;
  };

  const stopRepeat = () => {
    clearRepeatTimers();
    setHeldDirection(0);
  };

  const startRepeat = (key: ArrowKey) => {
    clearRepeatTimers();
    pressedArrowKey = key;
    const direction = getDirectionForKey(key);
    repeatInitialDelayId = setTimeout(() => {
      repeatIntervalId = setInterval(() => {
        options.step(direction, options.isShiftHeld(), true);
      }, EDIT_STEP_REPEAT_INTERVAL_MS);
    }, EDIT_STEP_REPEAT_INITIAL_DELAY_MS);
  };

  const pressArrow = (key: ArrowKey, isRepeat: boolean, shiftKey: boolean): void => {
    if (isRepeat) return;
    const direction = getDirectionForKey(key);
    startRepeat(key);
    setHeldDirection(direction);
    options.step(direction, shiftKey, false);
  };

  const releaseKey = (key: string) => {
    if (key === pressedArrowKey) stopRepeat();
  };

  onMount(() => {
    // Window blur (alt-tab, focus an iframe) means the matching keyup
    // may never reach us — without this, the long-press repeat keeps
    // stepping the active property silently in the background.
    window.addEventListener("blur", stopRepeat);
    onCleanup(() => window.removeEventListener("blur", stopRepeat));
  });

  onCleanup(stopRepeat);

  return { heldDirection, pressArrow, releaseKey, cancelRepeat: stopRepeat };
};
