"use client";

import { useEffect, useCallback } from "react";
import {
  parseKeyCombo,
  matchesKeyCombo,
  isInputElement,
} from "@/lib/keyboard-utils";

interface UseKeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputFields?: boolean;
}

export function useKeyboardShortcut(
  shortcut: string,
  callback: () => void,
  options: UseKeyboardShortcutOptions = {},
): void {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputFields = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (ignoreInputFields && isInputElement(event.target)) return;

      const combo = parseKeyCombo(shortcut);
      if (matchesKeyCombo(event, combo)) {
        if (preventDefault) event.preventDefault();
        callback();
      }
    },
    [shortcut, callback, enabled, preventDefault, ignoreInputFields],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
