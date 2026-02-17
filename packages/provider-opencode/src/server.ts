import { startProviderServer } from "@react-grab/relay";
import { openCodeAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("opencode", openCodeAgentHandler);
};
