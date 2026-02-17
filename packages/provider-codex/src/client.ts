import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createCodexAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "codex",
    pluginName: "codex-agent",
    actionId: "edit-with-codex",
    actionLabel: "Edit with Codex",
  });

export { createCodexAgentProvider, attachAgent };

attachAgent();
