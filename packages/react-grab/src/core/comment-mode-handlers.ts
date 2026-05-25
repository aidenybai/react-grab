import { type Accessor } from "solid-js";
import { DEFAULT_ACTION_ID } from "../constants.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { createGrabStore } from "./store.js";
import type { GrabPhaseSelectors } from "./selectors.js";
import type { ToolbarStateController } from "./toolbar-state-controller.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

interface CommentModeHandlersInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  activationLifecycle: ActivationLifecycle;
  toolbarStateController: ToolbarStateController;
  isEnabled: Accessor<boolean>;
  /** Store the pending-default-action id for the next click to consume. */
  setPendingDefaultActionId: (actionId: string | null) => void;
  /** Mark the next click as "select an element then run the default action". */
  setPendingContextMenuSelect: (value: boolean) => void;
}

export interface CommentModeHandlers {
  /**
   * Toolbar "select" button click. Toggles activation; when activating from
   * idle, primes either comment mode (default) or a pending-default-action
   * select depending on the toolbar's configured defaultAction.
   */
  handleToggleActive: () => void;
  /** Enter comment mode for a specific element. Called from drag handlers. */
  enterCommentModeForElement: (element: Element, positionX: number, positionY: number) => void;
  /** Public api.comment() — flips into comment mode (activating if needed). */
  handleComment: () => void;
}

/**
 * The three handlers around "comment mode" — the prompt-style activation that
 * the toolbar's default-action toggle and the public api.comment() share.
 */
export const createCommentModeHandlers = (
  input: CommentModeHandlersInput,
): CommentModeHandlers => {
  const {
    grab,
    phase,
    activationLifecycle,
    toolbarStateController,
    isEnabled,
    setPendingDefaultActionId,
    setPendingContextMenuSelect,
  } = input;
  const { actions } = grab;
  const { isActivated, isCommentMode } = phase;
  const { deactivateRenderer, toggleActivate } = activationLifecycle;

  const handleToggleActive = () => {
    if (isActivated()) {
      deactivateRenderer();
      return;
    }
    if (!isEnabled()) return;
    const defaultActionId =
      toolbarStateController.current()?.defaultAction ?? DEFAULT_ACTION_ID;
    if (defaultActionId === DEFAULT_ACTION_ID) {
      actions.setPendingCommentMode(true);
    } else {
      setPendingDefaultActionId(defaultActionId);
      setPendingContextMenuSelect(true);
    }
    toggleActivate();
  };

  const enterCommentModeForElement = (
    element: Element,
    positionX: number,
    positionY: number,
  ) => {
    actions.setPendingCommentMode(false);
    actions.clearInputText();
    actions.enterPromptMode({ x: positionX, y: positionY }, element);
  };

  const handleComment = () => {
    if (!isEnabled()) return;

    const isAlreadyInCommentMode = isActivated() && isCommentMode();
    if (isAlreadyInCommentMode) {
      deactivateRenderer();
      return;
    }

    actions.setPendingCommentMode(true);
    if (!isActivated()) {
      toggleActivate();
    }
  };

  return { handleToggleActive, enterCommentModeForElement, handleComment };
};
