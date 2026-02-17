import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createCopilotAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "copilot",
    pluginName: "copilot-agent",
    actionId: "edit-with-copilot",
    actionLabel: "Edit with Copilot",
  });

export { createCopilotAgentProvider, attachAgent };

attachAgent();
