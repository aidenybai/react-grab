import { type Accessor } from "solid-js";
import type { Position } from "../types.js";
import type { createGrabStore } from "./store.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

interface PromptModePresetInput {
  grab: GrabStoreHandle;
  pointer: Accessor<Position>;
  targetElement: Accessor<Element | null>;
}

export interface PromptModePreset {
  /**
   * Stage the prompt-mode reactive inputs (copy-start position + cleared
   * input text) without flipping the phase. Callers typically follow this
   * with `activatePromptMode()` or `actions.enterPromptMode(...)` to flip
   * the actual phase.
   */
  preparePromptMode: (element: Element, positionX: number, positionY: number) => void;
  /**
   * Flip into prompt-mode for the current frozen-or-targeted element, using
   * the live pointer position. No-op if neither is present.
   */
  activatePromptMode: () => void;
}

/**
 * Pure orchestration helpers shared by the activation-key handlers, the
 * prompt-mode UI handlers, and the action-context builder. They are
 * small, but co-locating them prevents subtle divergence between the
 * three callsites that all stage prompt-mode entry.
 */
export const createPromptModePreset = (input: PromptModePresetInput): PromptModePreset => {
  const { grab, pointer, targetElement } = input;
  const { store, actions } = grab;

  const preparePromptMode = (
    element: Element,
    positionX: number,
    positionY: number,
  ) => {
    actions.setCopyStart({ x: positionX, y: positionY }, element);
    actions.clearInputText();
  };

  const activatePromptMode = () => {
    const element = store.frozenElement || targetElement();
    if (element) {
      actions.enterPromptMode({ x: pointer().x, y: pointer().y }, element);
    }
  };

  return { preparePromptMode, activatePromptMode };
};
