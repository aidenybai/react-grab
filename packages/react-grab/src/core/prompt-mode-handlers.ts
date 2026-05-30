import { type Accessor, type Setter } from "solid-js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { CopyOrchestrator } from "./copy-orchestrator.js";
import type { GrabStoreHandle } from "./store.js";
import type { GrabPhaseSelectors } from "./selectors.js";


interface PromptModeHandlersInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  /** Currently-targeted element (live or frozen). */
  targetElement: Accessor<Element | null>;
  activationLifecycle: ActivationLifecycle;
  copyOrchestrator: CopyOrchestrator;
  preparePromptMode: (element: Element, x: number, y: number) => void;
  activatePromptMode: () => void;
  /** Setter for the selection-label shake-count signal (visual feedback on cancel). */
  setSelectionLabelShakeCount: Setter<number>;
}

export interface PromptModeHandlers {
  /** Submit the prompt: copy the frozen+input elements with the typed prompt. */
  handleInputSubmit: () => void;
  /** Cancel button or Esc: shows the "discard?" confirmation; deactivates on second press. */
  handleInputCancel: () => void;
  /** "Discard" confirmation answered yes: clear input and deactivate. */
  handleConfirmDismiss: () => void;
  /** "Discard" confirmation answered no: revert to prompt mode. */
  handleCancelDismiss: () => void;
  /** Tag-badge or Enter to toggle the prompt mode open from a hover state. */
  handleToggleExpand: () => void;
}

/**
 * The 5 UI handlers that drive the prompt-mode flow (typing extra context
 * for a selection before copying). Each is a small bookkeeping function
 * over the grab store; concentrating them here keeps init() free of the
 * "submit -> copy" / "cancel -> dismiss/deactivate" branches.
 */
export const createPromptModeHandlers = (input: PromptModeHandlersInput): PromptModeHandlers => {
  const {
    grab,
    phase,
    targetElement,
    activationLifecycle,
    copyOrchestrator,
    preparePromptMode,
    activatePromptMode,
    setSelectionLabelShakeCount,
  } = input;
  const { store, actions, pointer } = grab;
  const { isPromptMode, isPendingDismiss } = phase;
  const { deactivateRenderer } = activationLifecycle;
  const { performCopyWithLabel } = copyOrchestrator;

  const handleInputSubmit = () => {
    actions.clearLastCopied();
    const frozenElements = [...store.frozenElements];
    const element = store.frozenElement || targetElement();
    const prompt = isPromptMode() ? store.inputText.trim() : "";

    if (!element) {
      deactivateRenderer();
      return;
    }

    const elements = frozenElements.length > 0 ? frozenElements : [element];

    const currentSelectionBounds = elements.map((selectedElement) =>
      createElementBounds(selectedElement),
    );
    const firstBounds = currentSelectionBounds[0];
    const { x: currentX, y: currentY } = getBoundsCenter(firstBounds);
    const labelPositionX = currentX + store.copyOffsetFromCenterX;

    actions.setPointer({ x: currentX, y: currentY });
    actions.exitPromptMode();
    actions.clearInputText();

    performCopyWithLabel({
      element,
      cursorX: labelPositionX,
      selectedElements: elements,
      extraPrompt: prompt || undefined,
      shouldDeactivateAfter: true,
    });
  };

  const handleInputCancel = () => {
    actions.clearLastCopied();
    if (!isPromptMode()) return;

    if (isPendingDismiss()) {
      actions.clearInputText();
      deactivateRenderer();
      return;
    }

    actions.setPendingDismiss(true);
    setSelectionLabelShakeCount((count) => count + 1);
  };

  const handleConfirmDismiss = () => {
    actions.clearInputText();
    deactivateRenderer();
  };

  const handleCancelDismiss = () => {
    actions.setPendingDismiss(false);
  };

  const handleToggleExpand = () => {
    const element = store.frozenElement || targetElement();
    if (element) {
      preparePromptMode(element, pointer().x, pointer().y);
    }
    activatePromptMode();
  };

  return {
    handleInputSubmit,
    handleInputCancel,
    handleConfirmDismiss,
    handleCancelDismiss,
    handleToggleExpand,
  };
};
