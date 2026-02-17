import { startProviderServer } from "@react-grab/relay";
import { codexAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("codex", codexAgentHandler);
};
