import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createOpenCodeAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "opencode",
    pluginName: "opencode-agent",
    actionId: "edit-with-opencode",
    actionLabel: "Edit with OpenCode",
  });

export { createOpenCodeAgentProvider, attachAgent };

attachAgent();
