import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createAmpAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "amp",
    pluginName: "amp-agent",
    actionId: "edit-with-amp",
    actionLabel: "Edit with Amp",
  });

export { createAmpAgentProvider, attachAgent };

attachAgent();
