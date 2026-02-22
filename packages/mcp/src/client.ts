import type { init, ReactGrabAPI, Plugin, AgentContext } from "react-grab/core";
import { DEFAULT_MCP_PORT, HEALTH_CHECK_TIMEOUT_MS } from "./constants.js";

interface McpPluginOptions {
  port?: number;
}

const sendContextToServer = async (
  contextUrl: string,
  content: string[],
  prompt?: string,
): Promise<void> => {
  await fetch(contextUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, prompt }),
  }).catch(() => {});
};

export const createMcpPlugin = (options: McpPluginOptions = {}): Plugin => {
  const port = options.port ?? DEFAULT_MCP_PORT;
  const contextUrl = `http://localhost:${port}/context`;

  return {
    name: "mcp",
    hooks: {
      onCopySuccess: (_elements: Element[], content: string) => {
        void sendContextToServer(contextUrl, [content]);
      },
      transformAgentContext: async (
        context: AgentContext,
      ): Promise<AgentContext> => {
        await sendContextToServer(contextUrl, context.content, context.prompt);
        return context;
      },
    },
  };
};

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

const MCP_REACHABLE_KEY = "react-grab-mcp-reachable";

const checkIfMcpServerIsReachable = async (port: number): Promise<boolean> => {
  const cached = sessionStorage.getItem(MCP_REACHABLE_KEY);
  if (cached !== null) return cached === "true";

  const isReachable = await fetch(`http://localhost:${port}/health`, {
    signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
  })
    .then((response) => response.ok)
    .catch(() => false);

  sessionStorage.setItem(MCP_REACHABLE_KEY, String(isReachable));
  return isReachable;
};

export const attachMcpPlugin = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  const isReachable = await checkIfMcpServerIsReachable(DEFAULT_MCP_PORT);
  if (!isReachable) return;

  const plugin = createMcpPlugin();

  const attach = (api: ReactGrabAPI) => {
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

attachMcpPlugin();
