import { isLinux } from "./is-linux.js";
import { isMac } from "./is-mac.js";

export const isScreenshotShortcutPressed = (event: KeyboardEvent): boolean => {
  if (isLinux()) {
    return event.key === "PrintScreen" || event.code === "PrintScreen";
  }
  if (isMac()) {
    return event.metaKey && event.shiftKey;
  }
  return event.metaKey && event.shiftKey;
};

export const isScreenshotShortcutReleased = (event: KeyboardEvent): boolean => {
  if (isLinux()) {
    return event.key === "PrintScreen" || event.code === "PrintScreen";
  }
  return event.key === "Meta" || event.key === "Shift";
};
