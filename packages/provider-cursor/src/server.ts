import { startProviderServer } from "@react-grab/relay";
import { cursorAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("cursor", cursorAgentHandler);
};
