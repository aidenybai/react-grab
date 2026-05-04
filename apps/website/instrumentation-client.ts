// react-grab is loaded via a raw <script> tag in layout.tsx (not bundled
// through Next.js) because both Turbopack and webpack break SolidJS
// internals via dead code elimination. The IIFE script auto-calls init()
// and sets window.__REACT_GRAB__. This file registers plugins on it.

export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __REACT_GRAB__?: any;
  }
}

const registerPlugins = () => {
  const api = window.__REACT_GRAB__;
  if (!api) return;

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
};

if (typeof window !== "undefined") {
  if (window.__REACT_GRAB__) {
    registerPlugins();
  } else {
    // script.js may not have executed yet - wait for it
    const observer = new MutationObserver(() => {
      if (window.__REACT_GRAB__) {
        observer.disconnect();
        registerPlugins();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    // Fallback timeout
    setTimeout(() => {
      observer.disconnect();
      registerPlugins();
    }, 3000);
  }
}
