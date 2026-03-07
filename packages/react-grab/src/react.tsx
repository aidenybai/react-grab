"use client";

import "bippy";
import { useEffect, useRef } from "react";
import type { Options, ReactGrabAPI, SettableOptions } from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const getSettableOptions = (options: Options): SettableOptions => {
  const settableOptions: SettableOptions = {};
  if (options.activationMode !== undefined) {
    settableOptions.activationMode = options.activationMode;
  }
  if (options.keyHoldDuration !== undefined) {
    settableOptions.keyHoldDuration = options.keyHoldDuration;
  }
  if (options.allowActivationInsideInput !== undefined) {
    settableOptions.allowActivationInsideInput =
      options.allowActivationInsideInput;
  }
  if (options.maxContextLines !== undefined) {
    settableOptions.maxContextLines = options.maxContextLines;
  }
  if (options.activationKey !== undefined) {
    settableOptions.activationKey = options.activationKey;
  }
  if (options.getContent !== undefined) {
    settableOptions.getContent = options.getContent;
  }
  if (options.freezeReactUpdates !== undefined) {
    settableOptions.freezeReactUpdates = options.freezeReactUpdates;
  }
  return settableOptions;
};

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
      const settableOptions = getSettableOptions(props);
      if (Object.keys(settableOptions).length > 0) {
        existingApi.setOptions(settableOptions);
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
