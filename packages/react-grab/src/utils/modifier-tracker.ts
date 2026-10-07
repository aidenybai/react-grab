import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { ignoreRealInput } from "./runtime-mode.js";

// Tracks whether a keyboard modifier is currently held. Window blur resets it
// because a chord / alt-tab usually swallows the keyup event and leaves the
// flag stuck.
export const createModifierTracker = (
  readModifier: (event: KeyboardEvent) => boolean,
): Accessor<boolean> => {
  const [isHeld, setIsHeld] = createSignal(false);

  onMount(() => {
    const updateFromEvent = ignoreRealInput((event: KeyboardEvent) =>
      setIsHeld(readModifier(event)),
    );
    const clear = () => setIsHeld(false);
    window.addEventListener("keydown", updateFromEvent, { capture: true });
    window.addEventListener("keyup", updateFromEvent, { capture: true });
    window.addEventListener("blur", clear);
    onCleanup(() => {
      window.removeEventListener("keydown", updateFromEvent, { capture: true });
      window.removeEventListener("keyup", updateFromEvent, { capture: true });
      window.removeEventListener("blur", clear);
    });
  });

  return isHeld;
};
