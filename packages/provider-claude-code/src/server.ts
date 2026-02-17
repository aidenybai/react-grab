import { startProviderServer } from "@react-grab/relay";
import { claudeAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("claude-code", claudeAgentHandler);
};
