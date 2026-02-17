import { startProviderServer } from "@react-grab/relay";
import { ampAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("amp", ampAgentHandler);
};
