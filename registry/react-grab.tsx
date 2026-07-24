"use client";

import { useEffect } from "react";
import type { Options } from "react-grab";

declare global {
  interface Window {
    __REACT_GRAB_DISABLED__?: boolean;
  }
}

interface ReactGrabProps {
  enabled?: boolean;
  options?: Options;
}

const reactGrabOptions: Options = {
  // activationMode: "toggle",
  // activationKey: "Alt+KeyG",
  // keyHoldDuration: 500,
  // allowActivationInsideInput: true,
};

export const ReactGrab = (props: ReactGrabProps) => {
  useEffect(() => {
    if (props.enabled === false) return;

    let isActive = true;

    const loadReactGrab = async () => {
      window.__REACT_GRAB_DISABLED__ = true;
      try {
        const reactGrab = await import("react-grab");

        if (!isActive) return;

        const existingApi = reactGrab.getGlobalApi();
        if (existingApi) return;

        const api = reactGrab.init({
          ...reactGrabOptions,
          ...props.options,
        });

        reactGrab.setGlobalApi(api);
        window.dispatchEvent(new CustomEvent("react-grab:init", { detail: api }));
      } finally {
        delete window.__REACT_GRAB_DISABLED__;
      }
    };

    void loadReactGrab();

    return () => {
      isActive = false;
    };
  }, [props.enabled, props.options]);

  return null;
};
