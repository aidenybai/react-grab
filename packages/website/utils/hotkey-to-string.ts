import type { RecordedHotkey } from "@/components/grab-element-button";

export const hotkeyToString = (hotkey: RecordedHotkey): string => {
  const parts: string[] = [];
  if (hotkey.metaKey) parts.push("Meta");
  if (hotkey.ctrlKey) parts.push("Ctrl");
  if (hotkey.shiftKey) parts.push("Shift");
  if (hotkey.altKey) parts.push("Alt");
  if (hotkey.key) {
    const keyDisplay =
      hotkey.key === " " ? "Space" : hotkey.key.toLowerCase();
    parts.push(keyDisplay);
  }
  return parts.join("+");
};
