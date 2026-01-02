import { isMac } from "./is-mac.js";

export const formatShortcut = (shortcut: string): string => {
  if (shortcut === "Enter") {
    return "↵";
  }

  if (isMac()) {
    return `⌘${shortcut}`;
  }

  const normalizedShortcut = shortcut.replace("⇧", "Shift+");
  return `Ctrl+${normalizedShortcut}`;
};
