import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";

// Window-wide Shift tracker — single source of truth for the token chip
// + long-press 10x multiplier. Blur resets because chord / alt-tab
// usually swallows the keyup.
export const createShiftTracker = (): Accessor<boolean> => {
  const [isShiftHeld, setIsShiftHeld] = createSignal(false);

  onMount(() => {
    const updateFromEvent = (event: KeyboardEvent) => setIsShiftHeld(event.shiftKey);
    const clear = () => setIsShiftHeld(false);
    window.addEventListener("keydown", updateFromEvent, { capture: true });
    window.addEventListener("keyup", updateFromEvent, { capture: true });
    window.addEventListener("blur", clear);
    onCleanup(() => {
      window.removeEventListener("keydown", updateFromEvent, { capture: true });
      window.removeEventListener("keyup", updateFromEvent, { capture: true });
      window.removeEventListener("blur", clear);
    });
  });

  return isShiftHeld;
};
