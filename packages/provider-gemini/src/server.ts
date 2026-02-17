import { startProviderServer } from "@react-grab/relay";
import { geminiAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("gemini", geminiAgentHandler);
};
