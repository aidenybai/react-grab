import type {
  AgentCompleteResult,
  init,
  ReactGrabAPI,
  Plugin,
  ActionContext,
  AgentContext,
  AgentProvider,
} from "react-grab/core";

export type { AgentCompleteResult };

const AMI_DEEPLINK_BASE = "ami://new-chat";

const createDeeplinkAgentProvider = (): AgentProvider => {
  const send = async function* (context: AgentContext): AsyncIterable<string> {
    const combinedPrompt = `${context.prompt}\n\n${context.content.join("\n\n")}`;
    const encodedPrompt = encodeURIComponent(combinedPrompt);
    const deeplinkUrl = `${AMI_DEEPLINK_BASE}?prompt=${encodedPrompt}`;

    window.open(deeplinkUrl, "_self");

    yield "Opening Ami...";
  };

  return {
    send,
    checkConnection: async () => true,
    supportsResume: false,
    supportsFollowUp: false,
  };
};

export const createAmiAgentProvider = (): AgentProvider => {
  return createDeeplinkAgentProvider();
};

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = () => {
  if (typeof window === "undefined") return;

  const provider = createDeeplinkAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    const agent = { provider, storage: sessionStorage };
    const plugin: Plugin = {
      name: "ami-agent",
      actions: [
        {
          id: "edit-with-ami",
          label: "Edit with Ami",
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
