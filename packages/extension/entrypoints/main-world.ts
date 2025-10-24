import { init, cursorAdapter } from "react-grab";
import type { Adapter } from "react-grab";
import { onWindowMessage, postWindowMessage } from "@/utils/window-messaging";

/**
 * MAIN world unlisted script
 * - Runs in the page's context (has access to React internals)
 * - Injected by the ISOLATED content script via injectScript()
 * - Receives settings from ISOLATED world via window.postMessage
 */
export default defineUnlistedScript(() => {
  console.log("React Grab: MAIN world script loaded");

  let cleanup: (() => void) | undefined;

  // Listen for settings from ISOLATED world
  onWindowMessage("REACT_GRAB_SETTINGS", (data) => {
    console.log("React Grab: Received settings from ISOLATED world", data.settings);

    // Cleanup previous instance
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }

    // Initialize with new settings
    let adapter: Adapter | undefined;
    if (data.settings.adapter === "cursor") {
      adapter = cursorAdapter;
    }

    cleanup = init({
      hotkey: [...data.settings.hotkey.modifiers, data.settings.hotkey.key],
      keyHoldDuration: data.settings.keyHoldDuration,
      adapter,
    });

    console.log("React Grab: Initialized with hotkey", [
      ...data.settings.hotkey.modifiers,
      data.settings.hotkey.key,
    ]);
  });

  // Signal to ISOLATED world that we're ready to receive settings
  postWindowMessage("REACT_GRAB_READY", {});
  console.log("React Grab: MAIN world ready, sent READY signal");
});
