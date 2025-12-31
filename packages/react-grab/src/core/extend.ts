import type { Component } from "solid-js";

type BeforeCopyHandler = (elements: Element[]) => Promise<boolean>;
type ErrorHandler = (error: Error, elements: Element[]) => void;
type CopySuccessHandler = (elements: Element[], content: string) => void;
type AfterCopyHandler = (elements: Element[], success: boolean) => void;

let beforeCopyHandler: BeforeCopyHandler | null = null;
let errorHandler: ErrorHandler | null = null;
let copySuccessHandler: CopySuccessHandler | null = null;
let afterCopyHandler: AfterCopyHandler | null = null;

const overlays = new Set<Component>();

const onBeforeCopy = (handler: BeforeCopyHandler) => {
  beforeCopyHandler = handler;
};

const onError = (handler: ErrorHandler) => {
  errorHandler = handler;
};

const onCopySuccess = (handler: CopySuccessHandler) => {
  copySuccessHandler = handler;
};

const onAfterCopy = (handler: AfterCopyHandler) => {
  afterCopyHandler = handler;
};

const addOverlay = (component: Component): (() => void) => {
  overlays.add(component);
  return () => {
    overlays.delete(component);
  };
};

const getOverlays = (): Component[] => {
  return Array.from(overlays);
};

const clearExtensions = () => {
  beforeCopyHandler = null;
  errorHandler = null;
  copySuccessHandler = null;
  afterCopyHandler = null;
  overlays.clear();
};

export {
  beforeCopyHandler,
  errorHandler,
  copySuccessHandler,
  afterCopyHandler,
  overlays,
  onBeforeCopy,
  onError,
  onCopySuccess,
  onAfterCopy,
  addOverlay,
  getOverlays,
  clearExtensions,
};

export type { BeforeCopyHandler, ErrorHandler, CopySuccessHandler, AfterCopyHandler };
