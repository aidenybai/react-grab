import type { RequiredActivationKey } from "../types.js";
import { detectPlatform } from "../utils/detect-platform.js";

export type { RequiredActivationKey };

const STORAGE_KEY = "react-grab-shortcut-config";
const CONFIG_VERSION = 1;

interface StoredShortcutConfig {
  key: string | undefined;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  version: number;
}

export const getDefaultShortcut = (): RequiredActivationKey => {
  const { isMac } = detectPlatform();

  if (isMac) {
    return {
      key: undefined,
      metaKey: true,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    };
  }

  return {
    key: "g",
    metaKey: false,
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
  };
};

export const loadShortcutConfig = (): RequiredActivationKey | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredShortcutConfig;
    if (parsed.version !== CONFIG_VERSION) return null;

    return {
      key: parsed.key,
      metaKey: parsed.metaKey,
      ctrlKey: parsed.ctrlKey,
      shiftKey: parsed.shiftKey,
      altKey: parsed.altKey,
    };
  } catch {
    return null;
  }
};

export const saveShortcutConfig = (config: RequiredActivationKey): void => {
  try {
    const stored: StoredShortcutConfig = {
      ...config,
      version: CONFIG_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {}
};

export const clearShortcutConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
