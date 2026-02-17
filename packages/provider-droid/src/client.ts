import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createDroidAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "droid",
    pluginName: "droid-agent",
    actionId: "edit-with-droid",
    actionLabel: "Edit with Droid",
  });

export { createDroidAgentProvider, attachAgent };

attachAgent();
