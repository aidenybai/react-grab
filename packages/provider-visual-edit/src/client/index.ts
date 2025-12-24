// DEPRECATED: Visual-edit is now built into react-grab core
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.warn(
    "[@react-grab/visual-edit] This package is deprecated. " +
      "Visual-edit is now built into react-grab core. " +
      "Update your code: npx react-grab@latest'",
  );
}

export { createVisualEditAgentProvider, initVisualEdit } from "react-grab";
export type { VisualEditProviderOptions } from "react-grab";
export type { AgentCompleteResult } from "react-grab";

import type { ReactGrabAPI } from "react-grab";
import { initVisualEdit } from "react-grab";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setAgent" in value;

/**
 * Auto-attach visual-edit to React Grab when this module is loaded.
 * This function is called automatically and is kept for backward compatibility.
 * @deprecated Use the built-in visual-edit feature in react-grab instead
 */
export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const attach = async (api: ReactGrabAPI) => {
    await initVisualEdit(api);
  };

  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    await attach(existingApi);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      void attach(event.detail);
    },
    { once: true },
  );

  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    await attach(apiAfterListener);
  }
};

// Auto-attach when module loads (for backward compatibility)
if (typeof window !== "undefined") {
  void attachAgent();
}
