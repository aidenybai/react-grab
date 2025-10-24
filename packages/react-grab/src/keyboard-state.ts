import type { StoreApi } from "./utils/store.js";
import { createStore } from "./utils/store.js";

export type FormTags =
  | "input"
  | "INPUT"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "option"
  | "radio"
  | "searchbox"
  | "select"
  | "SELECT"
  | "slider"
  | "spinbutton"
  | "textarea"
  | "TEXTAREA"
  | "textbox";

export type Hotkey = KeyboardEvent["key"];

const FORM_TAGS_AND_ROLES: readonly FormTags[] = [
  "input",
  "textarea",
  "select",
  "searchbox",
  "slider",
  "spinbutton",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "textbox",
];

export const isCustomElement = (element: HTMLElement): boolean => {
  // we just do a basic check w/o any complex RegExp or validation against the list of legacy names containing a hyphen,
  // as none of them is likely to be an event target, and it won't hurt anyway if we miss.
  // see: https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
  return (
    Boolean(element.tagName) &&
    !element.tagName.startsWith("-") &&
    element.tagName.includes("-")
  );
};

export const isReadonlyArray = (
  value: unknown,
): value is readonly unknown[] => {
  return Array.isArray(value);
};

export const isHotkeyEnabledOnTagName = (
  event: KeyboardEvent,
  enabledOnTags: boolean | readonly FormTags[] = false,
): boolean => {
  const { composed, target } = event;

  let targetTagName: EventTarget | null | string | undefined;
  let targetRole: null | string | undefined;

  if (target instanceof HTMLElement && isCustomElement(target) && composed) {
    const composedPath = event.composedPath();
    const targetElement = composedPath[0];

    if (targetElement instanceof HTMLElement) {
      targetTagName = targetElement.tagName;
      targetRole = targetElement.role;
    }
  } else if (target instanceof HTMLElement) {
    targetTagName = target.tagName;
    targetRole = target.role;
  }

  if (isReadonlyArray(enabledOnTags)) {
    return Boolean(
      targetTagName &&
        enabledOnTags &&
        enabledOnTags.some(
          (tag) =>
            (typeof targetTagName === "string" &&
              tag.toLowerCase() === targetTagName.toLowerCase()) ||
            tag === targetRole,
        ),
    );
  }

  return Boolean(targetTagName && enabledOnTags && enabledOnTags);
};

export const isKeyboardEventTriggeredByInput = (
  event: KeyboardEvent,
): boolean => {
  return isHotkeyEnabledOnTagName(event, FORM_TAGS_AND_ROLES);
};

/**
 * Global keyboard state
 * This represents the physical keyboard - there's only one keyboard per page
 */
interface KeyboardState {
  keyPressTimestamps: Map<Hotkey, number>;
  pressedKeys: Set<Hotkey>;
}

/**
 * Global keyboard state store (singleton)
 * Shared across all react-grab instances
 */
export const keyboardStore = createStore<KeyboardState>(() => ({
  keyPressTimestamps: new Map(),
  pressedKeys: new Set(),
}));

/**
 * Global keyboard tracking cleanup function
 */
let keyboardTrackingCleanup: (() => void) | null = null;

/**
 * Start tracking keyboard events globally
 * This should only be called once per page
 */
function startKeyboardTracking(store: StoreApi<KeyboardState>): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isKeyboardEventTriggeredByInput(event)) {
      return;
    }

    if (event.code === undefined) {
      return;
    }

    store.setState((state) => {
      const newTimestamps = new Map(state.keyPressTimestamps);
      if (!state.pressedKeys.has(event.key)) {
        newTimestamps.set(event.key, Date.now());
      }
      return {
        ...state,
        keyPressTimestamps: newTimestamps,
        pressedKeys: new Set([event.key, ...state.pressedKeys]),
      };
    });
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code === undefined) {
      return;
    }

    store.setState((state) => {
      const newTimestamps = new Map(state.keyPressTimestamps);
      newTimestamps.delete(event.key);
      return {
        ...state,
        keyPressTimestamps: newTimestamps,
        pressedKeys: new Set(
          [...state.pressedKeys].filter((key) => key !== event.key),
        ),
      };
    });
  };

  const handleBlur = () => {
    store.setState((state) => ({
      ...state,
      keyPressTimestamps: new Map(),
      pressedKeys: new Set(),
    }));
  };

  const handleContextmenu = () => {
    store.setState((state) => ({
      ...state,
      keyPressTimestamps: new Map(),
      pressedKeys: new Set(),
    }));
  };

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleBlur);
  window.addEventListener("contextmenu", handleContextmenu);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("contextmenu", handleContextmenu);
  };
}

/**
 * Ensure global keyboard tracking is active
 * Safe to call multiple times - will only initialize once
 */
export function ensureKeyboardTracking(): void {
  if (!keyboardTrackingCleanup) {
    keyboardTrackingCleanup = startKeyboardTracking(keyboardStore);
  }
}

/**
 * Check if a specific key is currently pressed
 */
export const isKeyPressed = (key: Hotkey): boolean => {
  const { pressedKeys } = keyboardStore.getState();
  if (key.length === 1) {
    return (
      pressedKeys.has(key.toLowerCase()) || pressedKeys.has(key.toUpperCase())
    );
  }
  return pressedKeys.has(key);
};

/**
 * Watch for a key combination to be held for a duration
 */
export const watchKeyHeldFor = (
  key: Hotkey | Hotkey[],
  duration: number,
  onHeld: () => void,
): (() => void) => {
  let timeoutId: null | ReturnType<typeof setTimeout> = null;
  let unsubscribe: (() => void) | null = null;
  const watchStartTime = Date.now();

  const cleanup = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (unsubscribe !== null) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const checkSingleKeyPressed = (
    keyToCheck: Hotkey,
    pressedKeys: Set<string>,
  ) => {
    if (keyToCheck.length === 1) {
      return (
        pressedKeys.has(keyToCheck.toLowerCase()) ||
        pressedKeys.has(keyToCheck.toUpperCase())
      );
    }
    return pressedKeys.has(keyToCheck);
  };

  const checkAllKeysPressed = (pressedKeys: Set<string>) => {
    if (Array.isArray(key)) {
      return key.every((keyFromCombo) =>
        checkSingleKeyPressed(keyFromCombo, pressedKeys),
      );
    }
    return checkSingleKeyPressed(key, pressedKeys);
  };

  const scheduleCallback = () => {
    const state = keyboardStore.getState();
    const { pressedKeys } = state;

    if (!checkAllKeysPressed(pressedKeys)) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return;
    }

    const elapsed = Date.now() - watchStartTime;
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      onHeld();
      cleanup();
      return;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      onHeld();
      cleanup();
    }, remaining);
  };

  unsubscribe = keyboardStore.subscribe(
    () => {
      scheduleCallback();
    },
    (state) => state.pressedKeys,
  );

  scheduleCallback();

  return cleanup;
};
