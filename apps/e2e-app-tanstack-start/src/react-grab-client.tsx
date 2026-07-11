import { formatElementInfo, init } from "react-grab";

declare global {
  interface Window {
    formatElementInfo: typeof formatElementInfo;
    initReactGrab: typeof init;
  }
}

if (typeof window !== "undefined") {
  window.formatElementInfo = formatElementInfo;
  window.initReactGrab = init;
}

export const ReactGrabClient = () => null;
