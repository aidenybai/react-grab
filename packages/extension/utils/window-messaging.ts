/**
 * Type-safe window.postMessage utilities for ISOLATED ↔ MAIN world communication
 *
 * Cannot use browser.runtime.sendMessage because MAIN world doesn't have browser APIs
 * Must use window.postMessage instead
 */

import type { ExtensionSettings } from "./messaging";

/**
 * Messages sent between ISOLATED and MAIN world via window.postMessage
 */
export interface WindowMessageMap {
  // ISOLATED → MAIN: Send settings
  "REACT_GRAB_SETTINGS": {
    settings: ExtensionSettings;
  };

  // MAIN → ISOLATED: Ready to receive settings
  "REACT_GRAB_READY": Record<string, never>;
}

export type WindowMessageType = keyof WindowMessageMap;

/**
 * Type-safe window.postMessage sender
 * Usage: postWindowMessage("REACT_GRAB_SETTINGS", { settings })
 */
export function postWindowMessage<K extends WindowMessageType>(
  type: K,
  data: WindowMessageMap[K],
): void {
  window.postMessage(
    {
      type,
      ...data,
    },
    "*",
  );
}

/**
 * Type-safe window message event handler
 */
export type WindowMessageHandler<K extends WindowMessageType> = (
  data: WindowMessageMap[K],
  event: MessageEvent,
) => void;

/**
 * Create a type-safe window message receiver
 * Returns cleanup function to remove listener
 *
 * @example
 * const cleanup = onWindowMessage("REACT_GRAB_SETTINGS", (data) => {
 *   console.log("Received settings:", data.settings);
 * });
 */
export function onWindowMessage<K extends WindowMessageType>(
  type: K,
  handler: WindowMessageHandler<K>,
): () => void {
  const listener = (event: MessageEvent) => {
    // Security: only accept messages from same window
    if (event.source !== window) return;

    // Type check
    if (event.data?.type !== type) return;

    // Extract data (remove type field)
    const { type: _, ...data } = event.data;
    handler(data as WindowMessageMap[K], event);
  };

  window.addEventListener("message", listener);

  return () => {
    window.removeEventListener("message", listener);
  };
}

/**
 * Wait for a specific message type with timeout
 * Returns a promise that resolves when message is received
 *
 * @example
 * await waitForWindowMessage("REACT_GRAB_READY", 1000);
 */
export function waitForWindowMessage<K extends WindowMessageType>(
  type: K,
  timeoutMs: number = 5000,
): Promise<WindowMessageMap[K]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${type} message after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = onWindowMessage(type, (data) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    });
  });
}
