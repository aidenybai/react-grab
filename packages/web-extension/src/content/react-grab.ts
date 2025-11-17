import { init, getGlobalApi } from "react-grab";
import type { ReactGrabAPI } from "react-grab";

declare global {
  interface Window {
    __REACT_GRAB_EXTENSION_ACTIVE__?: boolean;
  }
}

let reactGrabApi: ReactGrabAPI | null = null;
let isExtensionEnabled = true;

const EXTENSION_MARKER = "__REACT_GRAB_EXTENSION_ACTIVE__";

window[EXTENSION_MARKER] = true;

const initializeReactGrab = () => {
  if (reactGrabApi) {
    return;
  }

  const existingApi = getGlobalApi();
  if (existingApi) {
    reactGrabApi = existingApi;
    return;
  }

  reactGrabApi = init({
    enabled: isExtensionEnabled,
    isExtension: true,
  });
};

const handleToggle = (enabled: boolean) => {
  isExtensionEnabled = enabled;

  if (enabled) {
    if (!reactGrabApi) {
      initializeReactGrab();
    } else {
      reactGrabApi.activate();
    }
  } else {
    if (reactGrabApi) {
      reactGrabApi.deactivate();
    }
  }
};

const isChromeRuntimeAvailable =
  typeof chrome !== "undefined" &&
  Boolean(chrome.runtime) &&
  typeof chrome.runtime.onMessage !== "undefined";

if (isChromeRuntimeAvailable) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "REACT_GRAB_TOGGLE") {
      handleToggle(message.enabled);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeReactGrab();
  });
} else {
  initializeReactGrab();
}
