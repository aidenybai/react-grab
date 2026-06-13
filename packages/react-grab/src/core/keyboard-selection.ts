import { createSignal, type Accessor } from "solid-js";
import { isElementConnected } from "../utils/is-element-connected.js";

interface KeyboardSelectionController {
  selectedElement: () => Element | null;
  isPendingDismiss: Accessor<boolean>;
  select: (element: Element, options?: { shouldPromptBeforeMouseHandoff?: boolean }) => void;
  clear: () => void;
  consumeMouseHandoff: () => boolean;
  showDismissPrompt: () => boolean;
  cancelDismiss: () => void;
  takeSelection: (fallbackElement?: Element | null) => Element | null;
}

export const createKeyboardSelectionController = (): KeyboardSelectionController => {
  const [isPendingDismiss, setIsPendingDismiss] = createSignal(false);
  let selectedElement: Element | null = null;
  let isMouseHandoffArmed = false;

  const connectedSelection = (): Element | null =>
    isElementConnected(selectedElement) ? selectedElement : null;

  const clear = () => {
    selectedElement = null;
    isMouseHandoffArmed = false;
    setIsPendingDismiss(false);
  };

  const armMouseHandoff = () => {
    if (connectedSelection()) isMouseHandoffArmed = true;
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
      isMouseHandoffArmed = Boolean(options?.shouldPromptBeforeMouseHandoff);
    },
    clear,
    consumeMouseHandoff: () => {
      if (!isMouseHandoffArmed) return false;
      isMouseHandoffArmed = false;
      return connectedSelection() !== null;
    },
    showDismissPrompt: () => {
      if (!connectedSelection()) {
        clear();
        return false;
      }
      if (isPendingDismiss()) return false;
      setIsPendingDismiss(true);
      return true;
    },
    cancelDismiss: () => {
      setIsPendingDismiss(false);
      armMouseHandoff();
    },
    takeSelection,
  };
};
