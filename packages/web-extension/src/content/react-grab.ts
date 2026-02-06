import { init } from "react-grab/core";
import type { Options, ReactGrabAPI } from "react-grab";
import TurndownService from "turndown";
import {
  LOCALHOST_INIT_DELAY_MS,
  STATE_QUERY_TIMEOUT_MS,
} from "../constants.js";
import {
  initSinkingClient,
  loadToolbarStateFromSinking,
  saveToolbarStateToSinking,
  subscribeToToolbarState,
  getCachedToolbarState,
} from "../storage/client.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".localhost");

const turndownService = new TurndownService();

interface ToolbarState {
  edge: "top" | "bottom" | "left" | "right";
  ratio: number;
  collapsed: boolean;
  enabled: boolean;
}

let extensionApi: ReactGrabAPI | null = null;
let lastToolbarState: ToolbarState | null = null;
let isApplyingExternalState = false;
let stateChangeUnsubscribe: (() => void) | null = null;
let sinkingUnsubscribe: (() => void) | null = null;

const isToolbarStateEqual = (
  stateA: ToolbarState | null,
  stateB: ToolbarState | null,
): boolean => {
  if (stateA === stateB) return true;
  if (!stateA || !stateB) return false;
  return (
    stateA.edge === stateB.edge &&
    stateA.ratio === stateB.ratio &&
    stateA.collapsed === stateB.collapsed &&
    stateA.enabled === stateB.enabled
  );
};

const handleToolbarStateFromApi = (toolbarState: ToolbarState | null): void => {
  if (isApplyingExternalState) return;
  if (!toolbarState) return;
  if (isToolbarStateEqual(lastToolbarState, toolbarState)) return;
  lastToolbarState = toolbarState;
  void saveToolbarStateToSinking(toolbarState);
};

const handleSinkingChange = (): void => {
  const cachedState = getCachedToolbarState();
  if (!cachedState) return;
  if (isToolbarStateEqual(lastToolbarState, cachedState)) return;

  lastToolbarState = cachedState;
  const api = getActiveApi();
  if (api) {
    isApplyingExternalState = true;
    api.setToolbarState(cachedState);
    isApplyingExternalState = false;
  }
};

const subscribeToStateChanges = (api: ReactGrabAPI): void => {
  if (stateChangeUnsubscribe) {
    stateChangeUnsubscribe();
  }
  stateChangeUnsubscribe = api.onToolbarStateChange((state) => {
    handleToolbarStateFromApi(state);
  });

  if (sinkingUnsubscribe) {
    sinkingUnsubscribe();
  }
  sinkingUnsubscribe = subscribeToToolbarState(handleSinkingChange);
};

const disableCorePersistence = (api: ReactGrabAPI): void => {
  api.setOptions({ persistToolbarState: false });
};

const createExtensionApi = (): ReactGrabAPI => {
  const options: Options = { enabled: true, persistToolbarState: false };

  if (!isLocalhost) {
    options.getContent = (elements) => {
      const combinedHtml = elements
        .map((element) => element.outerHTML)
        .join("\n\n");
      return turndownService.turndown(combinedHtml);
    };
  }

  const api = init(options);
  extensionApi = api;
  window.__REACT_GRAB__ = api;
  subscribeToStateChanges(api);
  return api;
};

const getActiveApi = (): ReactGrabAPI | null => {
  return extensionApi ?? window.__REACT_GRAB__ ?? null;
};

const initializeReactGrab = (): Promise<ReactGrabAPI | null> => {
  const activeApi = getActiveApi();
  if (activeApi) {
    extensionApi = activeApi;
    return Promise.resolve(activeApi);
  }

  if (isLocalhost) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const delayedApi = getActiveApi();
        if (delayedApi) {
          extensionApi = delayedApi;
          disableCorePersistence(delayedApi);
          subscribeToStateChanges(delayedApi);
          resolve(delayedApi);
          return;
        }
        resolve(null);
      }, LOCALHOST_INIT_DELAY_MS);
    });
  }

  const createdApi = createExtensionApi();
  return Promise.resolve(createdApi);
};

window.addEventListener("react-grab:init", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const pageApi = event.detail;
  if (!pageApi) return;
  if (extensionApi && extensionApi !== pageApi) {
    extensionApi.dispose();
  }
  extensionApi = pageApi;
  window.__REACT_GRAB__ = pageApi;
  disableCorePersistence(pageApi);
  subscribeToStateChanges(pageApi);
});

const handleToggle = async (enabled: boolean): Promise<void> => {
  await initializeReactGrab();

  const api = getActiveApi();
  if (api) {
    api.setEnabled(enabled);
  }
};

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "__REACT_GRAB_EXTENSION_TOGGLE__") {
    void handleToggle(event.data.enabled);
  }
});

interface InitialState {
  enabled: boolean;
}

const queryInitialState = (): Promise<InitialState> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ enabled: true });
    }, STATE_QUERY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "__REACT_GRAB_STATE_RESPONSE__") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve({
          enabled: event.data.enabled ?? true,
        });
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "__REACT_GRAB_QUERY_STATE__" }, "*");
  });
};

const requestWorkerUrl = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, STATE_QUERY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "__REACT_GRAB_WORKER_URL__") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(event.data.workerUrl ?? null);
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "__REACT_GRAB_GET_WORKER_URL__" }, "*");
  });
};

const startup = async (): Promise<void> => {
  const [initialState, workerUrl] = await Promise.all([
    queryInitialState(),
    requestWorkerUrl(),
  ]);

  if (workerUrl) {
    initSinkingClient(workerUrl);
  }

  const api = await initializeReactGrab();

  if (api) {
    const sinkingToolbarState = await loadToolbarStateFromSinking();
    if (sinkingToolbarState) {
      isApplyingExternalState = true;
      api.setToolbarState(sinkingToolbarState);
      isApplyingExternalState = false;
    }

    if (!initialState.enabled) {
      api.setEnabled(false);
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void startup();
  });
} else {
  void startup();
}
