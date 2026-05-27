import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import {
  EDIT_STEP_REPEAT_INITIAL_DELAY_MS,
  EDIT_STEP_REPEAT_INTERVAL_MS,
} from "../../constants.js";

type ArrowKey = "ArrowLeft" | "ArrowRight";
type Direction = 1 | -1;

const directionFor = (key: ArrowKey): Direction => (key === "ArrowLeft" ? -1 : 1);

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
  let pressedKey: ArrowKey | null = null;
  let initialDelayId: ReturnType<typeof setTimeout> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stopRepeat = () => {
    if (initialDelayId !== null) clearTimeout(initialDelayId);
    if (intervalId !== null) clearInterval(intervalId);
    initialDelayId = null;
    intervalId = null;
    pressedKey = null;
    setHeldDirection(0);
  };

  const startRepeat = (key: ArrowKey) => {
    stopRepeat();
    pressedKey = key;
    const direction = directionFor(key);
    initialDelayId = setTimeout(() => {
      intervalId = setInterval(() => {
        options.step(direction, options.isShiftHeld(), true);
      }, EDIT_STEP_REPEAT_INTERVAL_MS);
    }, EDIT_STEP_REPEAT_INITIAL_DELAY_MS);
  };

  const pressArrow = (key: ArrowKey, isRepeat: boolean, shiftKey: boolean): void => {
    if (isRepeat) return;
    const direction = directionFor(key);
    // Order matters: `startRepeat` calls `stopRepeat` first, which
    // writes `setHeldDirection(0)`. Inside an event handler Solid
    // batches writes and only the LAST value commits. If we set the
    // held direction BEFORE startRepeat, the 0-write clobbers the
    // ±1-write and the panel's press-bump translateX never fires.
    startRepeat(key);
    setHeldDirection(direction);
    options.step(direction, shiftKey, false);
  };

  const releaseKey = (key: string) => {
    if (key === pressedKey) stopRepeat();
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
