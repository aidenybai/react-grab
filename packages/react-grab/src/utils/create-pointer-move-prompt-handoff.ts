interface PointerMovePromptHandoff {
  arm: () => void;
  clear: () => void;
  consume: () => boolean;
}

export const createPointerMovePromptHandoff = (): PointerMovePromptHandoff => {
  let isArmed = false;

  const consume = (): boolean => {
    if (!isArmed) return false;
    isArmed = false;
    return true;
  };

  return {
    arm: () => {
      isArmed = true;
    },
    clear: () => {
      isArmed = false;
    },
    consume,
  };
};
