/**
 * Type-safe messaging utilities for Chrome extension communication
 * Provides full type safety for browser.tabs.sendMessage and browser.runtime.sendMessage
 * Adapted from JSON Lens
 */

// Extract MessageSender type from global Browser namespace
type MessageSender = Parameters<
  Parameters<typeof browser.runtime.onMessage.addListener>[0]
>[1];

// ============================================================================
// Message Types Definition
// ============================================================================

/**
 * Define all possible messages and their responses here
 * This provides full type safety across popup <-> background <-> content script
 */
export interface MessageMap {
  "toggle-grab": {
    request: {
      enabled?: boolean;
    };
    response: {
      success: boolean;
    };
  };

  "grab-element": {
    request: {
      elementData?: string;
    };
    response:
      | {
          success: true;
          html: string;
          reactData: string;
          url: string;
          title: string;
        }
      | {
          success: false;
          error: string;
        };
  };

  "get-settings": {
    request: Record<string, never>;
    response: {
      settings: StorageSchema["settings"];
    };
  };
}

// ============================================================================
// Type-Safe Message Sender
// ============================================================================

/**
 * Send a type-safe message to a content script
 * Usage: await sendToTab(tabId, 'toggle-grab', { enabled: true })
 */
export async function sendToTab<K extends keyof MessageMap>(
  tabId: number,
  action: K,
  payload: MessageMap[K]["request"],
): Promise<MessageMap[K]["response"]> {
  return browser.tabs.sendMessage(tabId, {
    action,
    ...payload,
  }) as Promise<MessageMap[K]["response"]>;
}

/**
 * Send a type-safe message to the background script
 * Usage: await sendToBackground('get-settings', {})
 */
export async function sendToBackground<K extends keyof MessageMap>(
  action: K,
  payload: MessageMap[K]["request"],
): Promise<MessageMap[K]["response"]> {
  return browser.runtime.sendMessage({
    action,
    ...payload,
  }) as Promise<MessageMap[K]["response"]>;
}

// ============================================================================
// Type-Safe Message Receiver
// ============================================================================

/**
 * Message handler function type with full generic inference
 */
type MessageHandler<K extends keyof MessageMap> = (
  payload: MessageMap[K]["request"],
  sender: MessageSender,
) => Promise<MessageMap[K]["response"]> | MessageMap[K]["response"];

/**
 * Map of action to handler
 */
type HandlerMap = {
  [K in keyof MessageMap]?: MessageHandler<K>;
};

/**
 * Discriminated union of all possible messages
 */
type IncomingMessage = {
  [K in keyof MessageMap]: {
    action: K;
  } & MessageMap[K]["request"];
}[keyof MessageMap];

/**
 * Response type for a given action
 */
type ResponseForAction<T extends IncomingMessage> = T extends {
  action: infer K;
}
  ? K extends keyof MessageMap
    ? MessageMap[K]["response"]
    : never
  : never;

/**
 * Create a type-safe message receiver for browser.runtime.onMessage
 *
 * This provides full type inference for all message handlers:
 * - Request payloads are automatically typed
 * - Response types are enforced
 * - Handles both sync and async handlers
 * - Automatic error handling with fallback response
 *
 * @example
 * const receiver = createMessageReceiver({
 *   'toggle-grab': async (payload, sender) => {
 *     // payload is typed as { enabled?: boolean }
 *     return { success: true };
 *   },
 * });
 *
 * browser.runtime.onMessage.addListener(receiver);
 */
export function createMessageReceiver(handlers: HandlerMap) {
  return <T extends IncomingMessage>(
    message: T,
    sender: MessageSender,
    sendResponse: (response: ResponseForAction<T>) => void,
  ): true | undefined => {
    const { action, ...payload } = message;

    // Type-safe action checking using discriminated union
    if (action && action in handlers) {
      const handler = handlers[action];

      if (handler) {
        // Execute handler with proper typing
        Promise.resolve(handler(payload as any, sender))
          .then((response) => sendResponse(response as ResponseForAction<T>))
          .catch((error) => {
            console.error(
              `React Grab: Error in message handler for action "${action}":`,
              error,
            );
            // Cast error response to expected type
            sendResponse({
              success: false,
              error: String(error),
            } as ResponseForAction<T>);
          });

        // Return true to indicate async response
        return true;
      }
    }

    // Don't handle this message - let other listeners try
    return undefined;
  };
}

// ============================================================================
// Storage Type Safety
// ============================================================================

export interface ExtensionSettings {
  enabled: boolean;
  adapter: "none" | "cursor";
  hotkey: {
    key: string;
    modifiers: string[];
  };
  keyHoldDuration: number;
}

export interface GrabbedElement {
  id: string;
  html: string;
  reactData: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface ExtensionStats {
  today: number;
  total: number;
  lastReset: number;
}

export interface StorageSchema {
  settings: ExtensionSettings;
  history: GrabbedElement[];
  stats: ExtensionStats;
  lastGrabbed: GrabbedElement | null;
}

/**
 * Type-safe storage getter
 * Usage: const { settings } = await getStorage('settings');
 */
export async function getStorage<K extends keyof StorageSchema>(
  ...keys: K[]
): Promise<Pick<StorageSchema, K>> {
  return browser.storage.local.get(keys) as Promise<Pick<StorageSchema, K>>;
}

/**
 * Type-safe storage setter
 * Usage: await setStorage({ settings: newSettings });
 */
export async function setStorage(data: Partial<StorageSchema>): Promise<void> {
  return browser.storage.local.set(data);
}

/**
 * Get default settings
 */
export function getDefaultSettings(): ExtensionSettings {
  const isMac = navigator.platform.includes("Mac");
  return {
    enabled: true,
    adapter: "none",
    hotkey: {
      key: "g",
      modifiers: isMac ? ["Meta", "Shift"] : ["Control", "Shift"],
    },
    keyHoldDuration: 500,
  };
}

/**
 * Get default stats
 */
export function getDefaultStats(): ExtensionStats {
  return {
    today: 0,
    total: 0,
    lastReset: Date.now(),
  };
}
