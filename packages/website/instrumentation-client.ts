import { init } from "react-grab/core";

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  const api = init({});

  api.registerPlugin({
    name: "website-events",
    hooks: {
      onActivate: () => {
        window.dispatchEvent(new CustomEvent("react-grab:activated"));
      },
      onDeactivate: () => {
        window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
      },
    },
  });

  const isMobile =
    navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
  if (isMobile) {
    api.registerPlugin({
      name: "mobile-no-toolbar",
      theme: { toolbar: { enabled: false } },
    });
  }

  window.__REACT_GRAB__ = api;
}
