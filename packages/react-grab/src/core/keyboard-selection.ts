import { createSignal, type Accessor } from "solid-js";
import { createPointerMovePromptHandoff } from "../utils/create-pointer-move-prompt-handoff.js";
import { isElementConnected } from "../utils/is-element-connected.js";

interface KeyboardSelectionController {
  selectedElement: () => Element | null;
  isPendingDismiss: Accessor<boolean>;
  select: (element: Element, options?: { shouldPromptBeforeMouseHandoff?: boolean }) => void;
  clear: () => void;
  consumeMouseHandoff: () => boolean;
  showDismissPrompt: () => boolean;
  takeSelection: (fallbackElement?: Element | null) => Element | null;
}

export const createKeyboardSelectionController = (): KeyboardSelectionController => {
  const [isPendingDismiss, setIsPendingDismiss] = createSignal(false);
  let selectedElement: Element | null = null;
  const mouseHandoff = createPointerMovePromptHandoff();

  const connectedSelection = (): Element | null =>
    isElementConnected(selectedElement) ? selectedElement : null;

  const clear = () => {
    selectedElement = null;
    mouseHandoff.clear();
    setIsPendingDismiss(false);
  };

  const takeSelection = (fallbackElement?: Element | null): Element | null => {
    const element =
      connectedSelection() ?? (isElementConnected(fallbackElement) ? fallbackElement : null);
    clear();
    return element;
  };

  return {
    selectedElement: connectedSelection,
    isPendingDismiss,
    select: (element, options) => {
      selectedElement = element;
      setIsPendingDismiss(false);
      if (options?.shouldPromptBeforeMouseHandoff) mouseHandoff.arm();
      else mouseHandoff.clear();
    },
    clear,
    consumeMouseHandoff: () => mouseHandoff.consume() && connectedSelection() !== null,
    showDismissPrompt: () => {
      if (!connectedSelection()) {
        clear();
        return false;
      }
      if (isPendingDismiss()) return false;
      setIsPendingDismiss(true);
      return true;
    },
    takeSelection,
  };
};
