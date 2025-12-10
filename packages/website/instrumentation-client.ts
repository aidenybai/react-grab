import { createInstantAgentProvider } from "@react-grab/instant/client";
import { init } from "react-grab/core";

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  const api = init({
    onActivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:activated"));
    },
    onDeactivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
    },
  });

  const { provider, getOptions, onStart, onComplete, onUndo } =
    createInstantAgentProvider({ apiEndpoint: "/api/instant" });

  api.setAgent({
    provider,
    getOptions,
    storage: sessionStorage,
    onStart,
    onComplete,
    onUndo,
  });

  window.__REACT_GRAB__ = api;
}
