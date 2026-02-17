import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createClaudeAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "claude-code",
    pluginName: "claude-code-agent",
    actionId: "edit-with-claude-code",
    actionLabel: "Edit with Claude",
  });

export { createClaudeAgentProvider, attachAgent };

attachAgent();
