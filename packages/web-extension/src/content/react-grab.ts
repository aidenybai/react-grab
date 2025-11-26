import { init } from "react-grab";
import type { ReactGrabAPI } from "react-grab";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

let extensionApi: ReactGrabAPI | null = null;
let isExtensionEnabled = true;

const initializeReactGrab = () => {
  if (window.__REACT_GRAB__) {
    extensionApi = window.__REACT_GRAB__;
    return;
  }

  extensionApi = init({ enabled: isExtensionEnabled });
  window.__REACT_GRAB__ = extensionApi;
};

window.addEventListener("react-grab:init", (event) => {
  const pageApi = (event as CustomEvent).detail as ReactGrabAPI;
  if (extensionApi && extensionApi !== pageApi) {
    extensionApi.dispose();
  }
  extensionApi = pageApi;
  window.__REACT_GRAB__ = pageApi;
});

const handleToggle = (enabled: boolean) => {
  isExtensionEnabled = enabled;

  if (enabled) {
    if (!extensionApi) {
      initializeReactGrab();
    } else {
      extensionApi.activate();
    }
  } else {
    if (extensionApi) {
      extensionApi.deactivate();
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
  document.addEventListener("DOMContentLoaded", initializeReactGrab);
} else {
  initializeReactGrab();
}
