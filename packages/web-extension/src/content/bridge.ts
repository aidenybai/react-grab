// This script runs in ISOLATED world and bridges chrome.runtime messages to MAIN world

chrome.storage.onChanged.addListener((changes) => {
  if (changes.react_grab_enabled) {
    const newEnabled = changes.react_grab_enabled.newValue ?? true;
    window.postMessage(
      { type: "__REACT_GRAB_EXTENSION_TOGGLE__", enabled: newEnabled },
      "*",
    );
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REACT_GRAB_TOGGLE") {
    window.postMessage(
      { type: "__REACT_GRAB_EXTENSION_TOGGLE__", enabled: message.enabled },
      "*",
    );
    sendResponse({ success: true });
  }

  if (message.type === "GET_STATE") {
    sendResponse({ enabled: true });
  }

  return true;
});

window.addEventListener("message", (event) => {
  if (event.data?.type === "__REACT_GRAB_QUERY_STATE__") {
    chrome.storage.local.get(["react_grab_enabled"], (result) => {
      const enabled = result.react_grab_enabled ?? true;

      window.postMessage(
        {
          type: "__REACT_GRAB_STATE_RESPONSE__",
          enabled,
        },
        "*",
      );
    });
  }

  if (event.data?.type === "__REACT_GRAB_GET_WORKER_URL__") {
    const workerUrl = chrome.runtime.getURL("src/worker.ts");
    window.postMessage({ type: "__REACT_GRAB_WORKER_URL__", workerUrl }, "*");
  }
});
