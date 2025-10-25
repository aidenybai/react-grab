import { libStore } from "./index.js";

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

export const trackHotkeys = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isKeyboardEventTriggeredByInput(event)) {
      return;
    }

    libStore.setState((state) => {
      const newTimestamps = new Map(state.keyPressTimestamps);
      const newPressedKeys = new Set(state.pressedKeys);

      if (event.ctrlKey && !newPressedKeys.has("Control")) {
        newTimestamps.set("Control", Date.now());
        newPressedKeys.add("Control");
      }

      if (event.metaKey && !newPressedKeys.has("Meta")) {
        newTimestamps.set("Meta", Date.now());
        newPressedKeys.add("Meta");
      }

      if (event.altKey && !newPressedKeys.has("Alt")) {
        newTimestamps.set("Alt", Date.now());
        newPressedKeys.add("Alt");
      }

      if (event.shiftKey && !newPressedKeys.has("Shift")) {
        newTimestamps.set("Shift", Date.now());
        newPressedKeys.add("Shift");
      }

      if (!newPressedKeys.has(event.key)) {
        newTimestamps.set(event.key, Date.now());
        newPressedKeys.add(event.key);
      }

      return {
        ...state,
        keyPressTimestamps: newTimestamps,
        pressedKeys: newPressedKeys,
      };
    });
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    libStore.setState((state) => {
      const newTimestamps = new Map(state.keyPressTimestamps);
      const newPressedKeys = new Set(state.pressedKeys);

      newTimestamps.delete(event.key);
      newPressedKeys.delete(event.key);

      if (!event.ctrlKey) {
        newTimestamps.delete("Control");
        newPressedKeys.delete("Control");
      }

      if (!event.metaKey) {
        newTimestamps.delete("Meta");
        newPressedKeys.delete("Meta");
      }

      if (!event.altKey) {
        newTimestamps.delete("Alt");
        newPressedKeys.delete("Alt");
      }

      if (!event.shiftKey) {
        newTimestamps.delete("Shift");
        newPressedKeys.delete("Shift");
      }

      return {
        ...state,
        keyPressTimestamps: newTimestamps,
        pressedKeys: newPressedKeys,
      };
    });
  };

  const handleBlur = () => {
    libStore.setState((state) => ({
      ...state,
      keyPressTimestamps: new Map(),
      pressedKeys: new Set(),
    }));
  };

  const handleContextmenu = () => {
    libStore.setState((state) => ({
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
};

const isModifierKeyPressed = (
  key: string,
  pressedKeys: Set<string>,
): boolean => {
  if (key === "Control" || key === "Meta") {
    return pressedKeys.has("Control") || pressedKeys.has("Meta");
  }
  return pressedKeys.has(key);
};

export const isKeyPressed = (key: Hotkey) => {
  const { pressedKeys } = libStore.getState();

  if (key.length === 1) {
    return (
      pressedKeys.has(key.toLowerCase()) || pressedKeys.has(key.toUpperCase())
    );
  }

  return isModifierKeyPressed(key, pressedKeys);
};

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
    return isModifierKeyPressed(keyToCheck, pressedKeys);
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
    const state = libStore.getState();
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

  unsubscribe = libStore.subscribe(
    () => {
      scheduleCallback();
    },
    (state) => state.pressedKeys,
  );

  scheduleCallback();

  return cleanup;
};
