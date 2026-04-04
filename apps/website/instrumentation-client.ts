// react-grab is loaded via <Script src="/script.js" strategy="beforeInteractive" />
// in layout.tsx. Importing react-grab/core as a module causes Turbopack to bundle
// SolidJS internals, which breaks React hydration due to compile-time dead code
// elimination. Instead, we access the global API set by the pre-built IIFE script.

export {};

declare global {
  interface Window {
    __REACT_GRAB__?: {
      registerPlugin: (plugin: {
        name: string;
        hooks?: Record<string, () => void>;
        theme?: Record<string, unknown>;
      }) => void;
    };
  }
}

if (typeof window !== "undefined" && window.__REACT_GRAB__) {
  const api = window.__REACT_GRAB__;

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
}
