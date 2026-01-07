import type {
  AgentCompleteResult,
  init,
  ReactGrabAPI,
  Plugin,
  ActionContext,
} from "react-grab/core";
import {
  createRelayClient,
  createRelayAgentProvider,
  getDefaultRelayClient,
  type RelayClient,
  type AgentProvider,
} from "@react-grab/relay/client";

export type { AgentCompleteResult };

const AGENT_ID = "opencode";

interface OpenCodeAgentProviderOptions {
  relayClient?: RelayClient;
}

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

export const createOpenCodeAgentProvider = (
  providerOptions: OpenCodeAgentProviderOptions = {},
): AgentProvider => {
  const relayClient = providerOptions.relayClient ?? getDefaultRelayClient();

  return createRelayAgentProvider({
    relayClient,
    agentId: AGENT_ID,
  });
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const relayClient = createRelayClient();

  try {
    await relayClient.connect();
  } catch {
    return;
  }

  const provider = createRelayAgentProvider({
    relayClient,
    agentId: AGENT_ID,
  });

  const attach = (api: ReactGrabAPI) => {
    const agent = { provider, storage: sessionStorage };
    const plugin: Plugin = {
      name: "opencode-agent",
      actions: [
        {
          id: "edit-with-opencode",
          label: "Edit with OpenCode",
          shortcut: "Enter",
          onAction: (actionContext: ActionContext) => {
            actionContext.enterPromptMode?.(agent);
          },
          agent,
        },
      ],
    };
    api.registerPlugin(plugin);
  };

  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    attach(existingApi);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      attach(event.detail);
    },
    { once: true },
  );

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
