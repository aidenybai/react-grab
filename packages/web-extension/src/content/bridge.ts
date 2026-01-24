// This script runs in ISOLATED world and bridges chrome.runtime messages to MAIN world

chrome.storage.onChanged.addListener((changes) => {
  if (changes.react_grab_enabled) {
    const newEnabled = changes.react_grab_enabled.newValue ?? true;
    window.postMessage(
      { type: "__REACT_GRAB_EXTENSION_TOGGLE__", enabled: newEnabled },
      "*",
    );
  }

  if (changes.react_grab_toolbar_state) {
    const newState = changes.react_grab_toolbar_state.newValue;
    if (newState) {
      window.postMessage(
        { type: "__REACT_GRAB_TOOLBAR_STATE_CHANGE__", state: newState },
        "*",
      );
    }
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
    chrome.storage.local.get(
      ["react_grab_enabled", "react_grab_toolbar_state"],
      (result) => {
        const enabled = result.react_grab_enabled ?? true;
        const toolbarState = result.react_grab_toolbar_state ?? null;

        window.postMessage(
          {
            type: "__REACT_GRAB_STATE_RESPONSE__",
            enabled,
            toolbarState,
          },
          "*",
        );
      },
    );
  }

  if (event.data?.type === "__REACT_GRAB_TOOLBAR_STATE_SAVE__") {
    chrome.storage.local.set({ react_grab_toolbar_state: event.data.state });
  }
});
