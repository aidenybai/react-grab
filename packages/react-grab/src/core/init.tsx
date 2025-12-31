// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import { createRoot, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { mountRoot } from "../utils/mount-root.js";
import { bindEventListeners, unbindEventListeners } from "./events.js";
import { setGrab, setConfig, theme, updateTheme, isActive as isActiveSignal } from "./state.js";
import { activate, deactivate, copy } from "./actions.js";
import { clearExtensions, onCopySuccess, onAfterCopy, onError } from "./extend.js";
import { logIntro } from "./log-intro.js";
import { GrabRenderer } from "../components/grab-renderer.js";
import { mergeTheme } from "./theme.js";
import type { Theme, DeepPartial, ReactGrabAPI, ReactGrabState } from "../types.js";

interface PresetConfig {
  crosshair?: boolean;
  selectionBox?: boolean;
  label?: boolean;
}

interface InitOptions {
  preset?: PresetConfig;
  holdThreshold?: number;
  copyFeedbackDelay?: number;
  elementFilter?: (el: Element) => boolean;
  getContent?: (elements: Element[]) => Promise<string> | string;
  maxContextLines?: number;
  theme?: Theme;
  activationShortcut?: (event: KeyboardEvent) => boolean;
  allowActivationInsideInput?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementHover?: (element: Element) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopyError?: (error: Error) => void;
}

const presets: Record<string, PresetConfig> = {
  default: { crosshair: true, selectionBox: true, label: true },
  minimal: { crosshair: true, selectionBox: false, label: false },
  none: { crosshair: false, selectionBox: false, label: false },
};

let hasInited = false;
let disposeRoot: (() => void) | null = null;

const init = (options: InitOptions = {}): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (hasInited) {
    return () => {};
  }

  hasInited = true;
  logIntro();

  const preset = options.preset ?? presets.default;
  const mergedTheme = mergeTheme({
    ...options.theme,
    crosshair: { enabled: preset.crosshair ?? true },
    selectionBox: { enabled: preset.selectionBox ?? true },
    elementLabel: { enabled: preset.label ?? true },
  });

  updateTheme(mergedTheme);

  setConfig((prev) => ({
    ...prev,
    holdThreshold: options.holdThreshold ?? prev.holdThreshold,
    copyFeedbackDelay: options.copyFeedbackDelay ?? prev.copyFeedbackDelay,
    elementFilter: options.elementFilter,
    getContent: options.getContent,
    maxContextLines: options.maxContextLines,
  }));

  // Wire up copy callbacks
  if (options.onCopySuccess) {
    onCopySuccess(options.onCopySuccess);
  }
  if (options.onAfterCopy) {
    onAfterCopy(options.onAfterCopy);
  }
  if (options.onCopyError) {
    onError((error) => options.onCopyError!(error));
  }

  bindEventListeners({
    activationShortcut: options.activationShortcut,
    allowActivationInsideInput: options.allowActivationInsideInput ?? true,
    onActivate: options.onActivate,
    onDeactivate: options.onDeactivate,
    onElementHover: options.onElementHover,
  });

  const root = mountRoot(cssText);

  disposeRoot = createRoot((dispose) => {
    render(() => <GrabRenderer />, root);

    onCleanup(() => {
      unbindEventListeners();
      clearExtensions();
      setGrab({ state: "idle" });
    });

    return dispose;
  });

  const cleanup = () => {
    if (disposeRoot) {
      disposeRoot();
      disposeRoot = null;
    }
    hasInited = false;
  };

  const api: ReactGrabAPI = {
    activate: () => activate({ x: 0, y: 0 }),
    deactivate,
    toggle: () => {
      if (isActiveSignal()) {
        deactivate();
      } else {
        activate({ x: 0, y: 0 });
      }
    },
    isActive: () => isActiveSignal(),
    dispose: cleanup,
    copyElement: async (elements: Element | Element[]) => {
      const elementArray = Array.isArray(elements) ? elements : [elements];
      return copy(elementArray);
    },
    getState: (): ReactGrabState => {
      const state = isActiveSignal();
      return {
        isActive: state,
        isDragging: false,
        isCopying: false,
        isInputMode: false,
        targetElement: null,
        dragBounds: null,
      };
    },
    updateTheme: (partialTheme: DeepPartial<Theme>) => {
      updateTheme(partialTheme);
    },
    getTheme: () => theme(),
    setAgent: () => {},
    updateOptions: () => {},
  };

  if (typeof window !== "undefined") {
    (window as { __REACT_GRAB__?: ReactGrabAPI }).__REACT_GRAB__ = api;
  }

  return cleanup;
};

export { init, presets };

export type { InitOptions, PresetConfig };
