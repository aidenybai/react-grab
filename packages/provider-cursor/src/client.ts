import type { AgentCompleteResult } from "react-grab/core";
import { createProviderClientPlugin } from "@react-grab/relay/client";

export type { AgentCompleteResult };

const { createAgentProvider: createCursorAgentProvider, attachAgent } =
  createProviderClientPlugin({
    agentId: "cursor",
    pluginName: "cursor-agent",
    actionId: "edit-with-cursor",
    actionLabel: "Edit with Cursor",
  });

export { createCursorAgentProvider, attachAgent };

attachAgent();
