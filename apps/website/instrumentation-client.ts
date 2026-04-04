// Dynamic import avoids Turbopack statically bundling SolidJS internals,
// which breaks React hydration via compile-time dead code elimination.

export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __REACT_GRAB__?: any;
  }
}

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  import("react-grab/core").then(({ init }) => {
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

    const isMobile = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
    if (isMobile) {
      api.registerPlugin({
        name: "mobile-no-toolbar",
        theme: { toolbar: { enabled: false } },
      });
    }

    window.__REACT_GRAB__ = api;
  });
}
