import { startProviderServer } from "@react-grab/relay";
import { droidAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("droid", droidAgentHandler);
};
