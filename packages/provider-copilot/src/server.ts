import { startProviderServer } from "@react-grab/relay";
import { copilotAgentHandler } from "./handler.js";

export const startServer = () => {
  startProviderServer("copilot", copilotAgentHandler);
};
