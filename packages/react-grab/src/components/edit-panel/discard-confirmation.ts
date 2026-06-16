import { createSignal, onCleanup, type Accessor } from "solid-js";
import { EDIT_DISCARD_PROMPT_IDLE_MS } from "../../constants.js";

interface DiscardConfirmation {
  isPending: Accessor<boolean>;
  show: () => void;
  hide: () => void;
  cleanup: () => void;
}

export const createDiscardConfirmation = (): DiscardConfirmation => {
  const [isPending, setIsPending] = createSignal(false);
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    clearTimeout(timerId);
    setIsPending(false);
  };

  const show = () => {
    setIsPending(true);
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      setIsPending(false);
    }, EDIT_DISCARD_PROMPT_IDLE_MS);
  };

  const cleanup = () => {
    clearTimeout(timerId);
  };

  onCleanup(cleanup);

  return { isPending, show, hide, cleanup };
};
