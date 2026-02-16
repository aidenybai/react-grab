"use client";

import "bippy";
import { useEffect, useRef } from "react";
import type { Options, ReactGrabAPI, SettableOptions } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const shouldActivate = (): boolean => {
  if (typeof window === "undefined") return false;

  const isProduction = process.env.NODE_ENV === "production";
  const hasQueryParam =
    new URLSearchParams(window.location.search).get("react-grab") === "true";

  return !isProduction || hasQueryParam;
};

export const ReactGrab = (props: Options): null => {
  const apiRef = useRef<ReactGrabAPI | null>(null);
  const didInitRef = useRef(false);
  const didCreateRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    if (!shouldActivate()) return;

    didInitRef.current = true;

    const existingApi = window.__REACT_GRAB__;
    if (existingApi) {
      apiRef.current = existingApi;
      didCreateRef.current = false;
      const { enabled: _enabled, ...settableOptions } = props;
      if (Object.keys(settableOptions).length > 0) {
        existingApi.setOptions(settableOptions as SettableOptions);
      }
    } else {
      import("./core/index.js").then(({ init }) => {
        if (!didInitRef.current || apiRef.current) return;
        apiRef.current = init(props);
        didCreateRef.current = true;
      });
    }

    return () => {
      if (didCreateRef.current) {
        apiRef.current?.dispose();
      }
      apiRef.current = null;
      didInitRef.current = false;
      didCreateRef.current = false;
    };
  }, []);

  return null;
};
