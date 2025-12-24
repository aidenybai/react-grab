import { init, type ReactGrabAPI } from "react-grab";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const ABUSIVE_REGION_TIMEZONES = ["Asia/Kolkata", "Asia/Calcutta"];

const isUserInAbusiveRegion = (): boolean => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ABUSIVE_REGION_TIMEZONES.includes(timezone);
  } catch {
    return false;
  }
};

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  const api = init({
    onActivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:activated"));
    },
    onDeactivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
    },
    // HACK: temporarily disable visual edit for abusive regions
    visualEdit: isUserInAbusiveRegion()
      ? false
      : { apiEndpoint: "/api/visual-edit" },
  });

  window.__REACT_GRAB__ = api;
}
