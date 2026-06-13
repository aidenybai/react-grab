import { createSignal } from "solid-js";

interface PointerMovePromptHandoff {
  arm: () => void;
  clear: () => void;
  consume: () => boolean;
}

export const createPointerMovePromptHandoff = (): PointerMovePromptHandoff => {
  const [isArmed, setIsArmed] = createSignal(false);

  const consume = (): boolean => {
    if (!isArmed()) return false;
    setIsArmed(false);
    return true;
  };

  return {
    arm: () => setIsArmed(true),
    clear: () => setIsArmed(false),
    consume,
  };
};
