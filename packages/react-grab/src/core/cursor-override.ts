import { type Accessor, createEffect, on } from "solid-js";
import { detectCspNonce } from "../utils/detect-csp-nonce.js";
import { hideFromThirdParties } from "../utils/hide-from-third-parties.js";

interface CursorOverrideInput {
  isActivated: Accessor<boolean>;
  isCopying: Accessor<boolean>;
  isPromptMode: Accessor<boolean>;
}

export interface CursorOverride {
  /** Force-clear the cursor style; used from dispose paths. */
  clear: () => void;
}

/**
 * Injects a `* { cursor: <name> !important }` style sheet into the document
 * head while the overlay is in an interactive phase, so the browser-wide
 * cursor matches the overlay state. The style element is created on first
 * use and removed when the cursor returns to the default.
 *
 * Owns the document-side `<style>` lifetime, including CSP nonce detection
 * and the `hideFromThirdParties` mark.
 */
export const createCursorOverride = (input: CursorOverrideInput): CursorOverride => {
  const { isActivated, isCopying, isPromptMode } = input;
  let cursorStyleElement: HTMLStyleElement | null = null;

  const setCursorOverride = (cursor: string | null) => {
    if (cursor) {
      if (!cursorStyleElement) {
        cursorStyleElement = document.createElement("style");
        cursorStyleElement.setAttribute("data-react-grab-cursor", "");
        const nonce = detectCspNonce();
        if (nonce) cursorStyleElement.nonce = nonce;
        hideFromThirdParties(cursorStyleElement);
        document.head.appendChild(cursorStyleElement);
      }
      cursorStyleElement.textContent = `* { cursor: ${cursor} !important; }`;
      return;
    }
    if (cursorStyleElement) {
      cursorStyleElement.remove();
      cursorStyleElement = null;
    }
  };

  createEffect(
    on(
      () => [isActivated(), isCopying(), isPromptMode()] as const,
      ([activated, copying, promptMode]) => {
        if (copying) {
          setCursorOverride("progress");
        } else if (activated && !promptMode) {
          setCursorOverride("crosshair");
        } else {
          setCursorOverride(null);
        }
      },
    ),
  );

  return {
    clear: () => setCursorOverride(null),
  };
};
