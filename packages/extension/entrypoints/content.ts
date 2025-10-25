import {
  getStorage,
  setStorage,
  getDefaultSettings,
  createMessageReceiver,
} from "@/utils/messaging";
import {
  postWindowMessage,
  waitForWindowMessage,
} from "@/utils/window-messaging";

/**
 * ISOLATED world content script
 * - Has access to browser.storage and browser.runtime APIs
 * - Receives messages from background script (context menu, keyboard shortcut)
 * - Injects MAIN world script and sends settings via window.postMessage
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",

  async main(ctx) {
    console.log("React Grab: ISOLATED content script loaded");

    await injectScript("/main-world.js", {
      keepInDom: true,
    });
    console.log("React Grab: MAIN world script injected");

    // Send settings to MAIN world
    const sendSettingsToMainWorld = async () => {
      const { settings } = await getStorage("settings");
      const resolvedSettings = settings ?? getDefaultSettings();

      postWindowMessage("REACT_GRAB_SETTINGS", {
        settings: resolvedSettings,
      });
      console.log("React Grab: Sent settings to MAIN world", resolvedSettings);
    };

    // Wait for MAIN world to signal it's ready, then send initial settings
    try {
      await waitForWindowMessage("REACT_GRAB_READY", 2000);
      console.log("React Grab: MAIN world ready");
      await sendSettingsToMainWorld();
    } catch (error) {
      console.error("React Grab: Timeout waiting for MAIN world ready signal", error);
      // Send anyway as fallback
      await sendSettingsToMainWorld();
    }

    // Listen for storage changes
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.settings) {
        sendSettingsToMainWorld();
      }
    });

    // Handle messages from background script
    browser.runtime.onMessage.addListener(
      createMessageReceiver({
        "toggle-grab": async (payload) => {
          const { settings } = await getStorage("settings");
          const currentSettings = settings ?? getDefaultSettings();

          const newEnabled = payload.enabled ?? !currentSettings.enabled;
          const newSettings = {
            ...currentSettings,
            enabled: newEnabled,
          };

          await setStorage({ settings: newSettings });
          // Note: storage.onChanged listener will send settings to MAIN world

          console.log("React Grab: Toggled grab mode to", newEnabled);

          return { success: true };
        },
      }),
    );
  },
});
