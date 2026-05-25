import { type Accessor, createEffect, onCleanup } from "solid-js";
import { mountRoot } from "../utils/mount-root.js";
import { watchAppTheme } from "../utils/detect-app-theme.js";

export interface RendererHost {
  /** The host element (Shadow DOM container) inserted into <body>. */
  host: HTMLElement;
  /** The inner root where the SolidJS render() tree is mounted. */
  root: HTMLElement;
}

interface RendererHostInput {
  /** Raw CSS text injected into the shadow root. */
  cssText: string;
  /**
   * Reactive accessor for the hue-rotate degrees applied to the renderer
   * root via `filter`. A value of 0 clears the filter.
   */
  themeHue: Accessor<number>;
}

/**
 * Mounts the React Grab overlay's Shadow DOM host into the document,
 * installs the OS-theme watcher (light/dark prefers-color-scheme), and
 * wires the hue-rotation filter to the theme.hue reactive value.
 *
 * The theme watcher's cleanup is registered with the current Solid
 * `onCleanup`, so the controller tears down when the surrounding
 * createRoot() disposes.
 */
export const createRendererHost = (input: RendererHostInput): RendererHost => {
  const { root, host } = mountRoot(input.cssText);

  const themeWatcher = watchAppTheme(host);
  onCleanup(themeWatcher.cleanup);

  createEffect(() => {
    const hue = input.themeHue();
    root.style.filter = hue !== 0 ? `hue-rotate(${hue}deg)` : "";
  });

  return { host, root };
};
