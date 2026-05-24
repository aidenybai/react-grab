import { createSignal, onCleanup, type Accessor } from "solid-js";
import {
  EDIT_STEP_REPEAT_INITIAL_DELAY_MS,
  EDIT_STEP_REPEAT_INTERVAL_MS,
} from "../../constants.js";

type ArrowKey = "ArrowLeft" | "ArrowRight";
type Direction = 1 | -1;

const directionFor = (key: ArrowKey): Direction => (key === "ArrowLeft" ? -1 : 1);

interface StepControllerOptions {
  step: (direction: Direction, shift: boolean) => void;
  isShiftHeld: Accessor<boolean>;
}

export interface StepController {
  // -1 while ← held, 1 while → held, 0 idle.
  readonly heldDirection: Accessor<-1 | 0 | 1>;
  // OS-level keydown repeats are filtered (`isRepeat` short-circuits)
  // so our own interval drives the cadence after the initial press.
  pressArrow: (key: ArrowKey, isRepeat: boolean, shiftKey: boolean) => boolean;
  releaseKey: (key: string) => void;
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
        options.step(direction, options.isShiftHeld());
      }, EDIT_STEP_REPEAT_INTERVAL_MS);
    }, EDIT_STEP_REPEAT_INITIAL_DELAY_MS);
  };

  const pressArrow = (key: ArrowKey, isRepeat: boolean, shiftKey: boolean): boolean => {
    if (isRepeat) return false;
    setHeldDirection(directionFor(key));
    options.step(directionFor(key), shiftKey);
    startRepeat(key);
    return true;
  };

  const releaseKey = (key: string) => {
    if (key === pressedKey) stopRepeat();
  };

  onCleanup(stopRepeat);

  return { heldDirection, pressArrow, releaseKey };
};
