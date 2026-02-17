import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createGeminiAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "gemini",
    pluginName: "gemini-agent",
    actionId: "edit-with-gemini",
    actionLabel: "Edit with Gemini",
  });

export { createGeminiAgentProvider, attachAgent };

attachAgent();
