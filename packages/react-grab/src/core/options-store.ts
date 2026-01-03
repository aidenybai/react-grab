import { createStore } from "solid-js/store";
import type { ActivationMode, ActivationKey } from "../types.js";
import { DEFAULT_KEY_HOLD_DURATION_MS } from "../constants.js";

interface OptionsStoreState {
  activationMode: ActivationMode;
  keyHoldDuration: number;
  allowActivationInsideInput: boolean;
  maxContextLines: number;
  activationShortcut: ((event: KeyboardEvent) => boolean) | undefined;
  activationKey: ActivationKey | undefined;
  getContent: ((elements: Element[]) => Promise<string> | string) | undefined;
}

interface OptionsStoreInput {
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  activationShortcut?: (event: KeyboardEvent) => boolean;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
}

const createOptionsStore = (initialOptions: OptionsStoreInput) => {
  const [optionsState, setOptionsState] = createStore<OptionsStoreState>({
    activationMode: initialOptions.activationMode ?? "toggle",
    keyHoldDuration: initialOptions.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: initialOptions.allowActivationInsideInput ?? true,
    maxContextLines: initialOptions.maxContextLines ?? 3,
    activationShortcut: initialOptions.activationShortcut,
    activationKey: initialOptions.activationKey,
    getContent: initialOptions.getContent,
  });

  const setOptions = (optionUpdates: Partial<OptionsStoreInput>) => {
    for (const [optionKey, optionValue] of Object.entries(optionUpdates)) {
      if (optionValue === undefined) continue;
      setOptionsState(optionKey as keyof OptionsStoreState, optionValue as OptionsStoreState[keyof OptionsStoreState]);
    }
  };

  return {
    store: optionsState,
    setStore: setOptionsState,
    setOptions,
  };
};

export { createOptionsStore };
export type { OptionsStoreState, OptionsStoreInput };
