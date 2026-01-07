export const DEFAULT_RELAY_PORT = 4722;

export interface AgentMessage {
  type: "status" | "error" | "done";
  content: string;
}

export interface AgentContext {
  content: string[];
  prompt: string;
  options?: unknown;
  sessionId?: string;
}

export interface AgentRunOptions {
  cwd?: string;
  signal?: AbortSignal;
  sessionId?: string;
}

export interface AgentHandler {
  agentId: string;
  run: (
    userPrompt: string,
    options?: AgentRunOptions,
  ) => AsyncGenerator<AgentMessage>;
  abort?: (sessionId: string) => void;
  undo?: () => Promise<void>;
  redo?: () => Promise<void>;
}

export interface HandlerRegistrationMessage {
  type: "register-handler";
  agentId: string;
}

export interface HandlerUnregisterMessage {
  type: "unregister-handler";
  agentId: string;
}

export interface RelayToHandlerMessage {
  type: "invoke-handler";
  method: "run" | "abort" | "undo" | "redo";
  sessionId: string;
  payload?: {
    prompt?: string;
    context?: AgentContext;
  };
}

export interface HandlerToRelayMessage {
  type: "agent-status" | "agent-done" | "agent-error";
  sessionId: string;
  agentId: string;
  content?: string;
}

export interface BrowserToRelayMessage {
  type: "agent-request" | "agent-abort" | "agent-undo" | "agent-redo" | "health";
  agentId: string;
  sessionId?: string;
  context?: AgentContext;
}

export interface RelayToBrowserMessage {
  type: "agent-status" | "agent-done" | "agent-error" | "health" | "handlers";
  agentId?: string;
  sessionId?: string;
  content?: string;
  handlers?: string[];
}

export type HandlerMessage =
  | HandlerRegistrationMessage
  | HandlerUnregisterMessage
  | HandlerToRelayMessage;

export type RelayMessage = RelayToHandlerMessage | RelayToBrowserMessage;
