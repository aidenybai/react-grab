import type { AgentHandler, AgentMessage } from "@react-grab/relay";

const runAmiAgent = async function* (
  _prompt: string,
): AsyncGenerator<AgentMessage> {
  yield { type: "error", content: "Ami provider is not yet implemented" };
  yield { type: "done", content: "" };
};

export const amiAgentHandler: AgentHandler = {
  agentId: "ami",
  run: runAmiAgent,
};
