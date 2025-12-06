import { init } from "react-grab/core";
import { createRegenerateHtmlAgentProvider } from "./utils/regenerate-html-agent-provider";

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

  const { provider, getOptions, onStart, onComplete } =
    createRegenerateHtmlAgentProvider();

  api.setAgent({
    provider,
    getOptions,
    storage: sessionStorage,
    onStart,
    onComplete,
  });

  window.__REACT_GRAB__ = api;
}
