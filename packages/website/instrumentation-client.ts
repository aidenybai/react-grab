import { init } from "react-grab/core";

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  const api = init({
    // activationKey: "Space",
    // activationMode: "hold",
    // keyHoldDuration: 300,
    // allowActivationInsideInput: false,
    // maxContextLines: 3,
  });

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

  window.__REACT_GRAB__ = api;
}
