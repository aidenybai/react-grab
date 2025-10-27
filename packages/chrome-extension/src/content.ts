import { init } from "react-grab";
import type { Options } from "react-grab";
import { chromeAdapter, trackHoveredElement } from "./adapters/chrome-enhanced.js";

interface ExtensionSettings {
  enabled: boolean;
  hotkey: string[];
  keyHoldDuration: number;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  hotkey: ["Meta", "C"],
  keyHoldDuration: 500,
};

const initializeReactGrab = async () => {
  try {
    const result = await chrome.storage.sync.get("settings");
    const settings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      ...(result.settings || {}),
    };

    if (!settings.enabled) {
      console.log("[react-grab] Extension is disabled");
      return;
    }

    const options: Options = {
      adapter: chromeAdapter,
      enabled: settings.enabled,
      hotkey: settings.hotkey.length === 1 ? settings.hotkey[0] : settings.hotkey,
      keyHoldDuration: settings.keyHoldDuration,
    };

    const cleanup = init(options);
    const cleanupTracker = trackHoveredElement();

    console.log("[react-grab] Initialized with settings:", settings);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes.settings) {
        console.log("[react-grab] Settings changed, reloading page...");
        window.location.reload();
      }
    });

    return () => {
      cleanup?.();
      cleanupTracker();
    };
  } catch (error) {
    console.error("[react-grab] Failed to initialize:", error);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initializeReactGrab();
  });
} else {
  void initializeReactGrab();
}
