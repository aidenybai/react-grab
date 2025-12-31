import type { ActivationKey } from "../types.js";
import { detectPlatform } from "./detect-platform.js";

export const formatShortcut = (shortcut: ActivationKey): string => {
  const { isMac } = detectPlatform();
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(isMac ? "^" : "Ctrl");
  }
  if (shortcut.altKey) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  if (shortcut.metaKey) {
    parts.push(isMac ? "⌘" : "Win");
  }
  if (shortcut.key) {
    parts.push(shortcut.key.toUpperCase());
  }

  return parts.join(isMac ? "" : "+");
};

export const formatShortcutVerbose = (shortcut: ActivationKey): string => {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push("Ctrl");
  if (shortcut.altKey) parts.push("Alt");
  if (shortcut.shiftKey) parts.push("Shift");
  if (shortcut.metaKey) parts.push("Cmd/Win");
  if (shortcut.key) parts.push(shortcut.key.toUpperCase());

  return parts.join(" + ");
};
