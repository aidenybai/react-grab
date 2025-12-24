import type { ReactGrabAPI, init } from "react-grab/core";
import { createVisualEditAgentProvider } from "react-grab/visual-edit";

export * from "react-grab/visual-edit";

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

const DEFAULT_HEALTHCHECK_ENDPOINT =
  "https://www.react-grab.com/api/check-visual-edit";

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setAgent" in value;

const checkHealth = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(DEFAULT_HEALTHCHECK_ENDPOINT, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return data?.healthy === true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
};

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const isHealthy = await checkHealth();
  if (!isHealthy) return;

  const { provider, getOptions, onStart, onComplete, onUndo } =
    createVisualEditAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setAgent({
      provider,
      getOptions,
      onStart,
      onComplete,
      onUndo,
    });
  };

  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    attach(existingApi);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      attach(event.detail);
    },
    { once: true },
  );

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
