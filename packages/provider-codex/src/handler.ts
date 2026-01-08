import { Codex } from "@openai/codex-sdk";
import type { AgentHandler, AgentMessage, AgentRunOptions } from "@react-grab/relay";
import { COMPLETED_STATUS } from "./constants.js";

export interface CodexAgentOptions extends AgentRunOptions {
  model?: string;
  workingDirectory?: string;
}

type CodexThread = ReturnType<Codex["startThread"]>;

interface ThreadState {
  thread: CodexThread;
  threadId: string;
}

interface CodexEventItem {
  type: string;
  text?: string;
  command?: string;
}

interface CodexEvent {
  type: string;
  item?: CodexEventItem;
}

let codexInstance: Codex | null = null;
const threadMap = new Map<string, ThreadState>();
const abortControllers = new Map<string, AbortController>();
let lastSessionId: string | undefined;

const getCodexInstance = (): Codex => {
  if (!codexInstance) {
    codexInstance = new Codex();
  }
  return codexInstance;
};

const getOrCreateThread = (
  sessionId: string | undefined,
  options?: CodexAgentOptions,
): { thread: CodexThread; isExisting: boolean } => {
  const codex = getCodexInstance();

  if (sessionId && threadMap.has(sessionId)) {
    return { thread: threadMap.get(sessionId)!.thread, isExisting: true };
  }

  const thread = codex.startThread({
    workingDirectory:
      options?.workingDirectory ?? process.env.REACT_GRAB_CWD ?? process.cwd(),
  });

  return { thread, isExisting: false };
};

const formatStreamEvent = (event: CodexEvent): string | undefined => {
  switch (event.type) {
    case "item.completed":
      if (event.item?.type === "agent_message" && event.item.text) {
        return event.item.text;
      }
      if (event.item?.type === "command_execution" && event.item.command) {
        return `Executed: ${event.item.command}`;
      }
      return undefined;
    case "turn.completed":
      return undefined;
    default:
      return undefined;
  }
};

const runCodexAgent = async function* (
  prompt: string,
  options?: CodexAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const abortController = new AbortController();

  if (sessionId) {
    abortControllers.set(sessionId, abortController);
  }

  const isAborted = () => {
    if (options?.signal?.aborted) return true;
    if (abortController.signal.aborted) return true;
    return false;
  };

  try {
    yield { type: "status", content: "Thinking…" };

    const { thread } = getOrCreateThread(sessionId, {
      ...options,
      workingDirectory: options?.workingDirectory ?? options?.cwd,
    });

    if (sessionId) {
      lastSessionId = sessionId;
    }

    const { events } = await thread.runStreamed(prompt);

    for await (const event of events) {
      if (isAborted()) break;

      const statusText = formatStreamEvent(event as CodexEvent);
      if (statusText && !isAborted()) {
        yield { type: "status", content: statusText };
      }
    }

    if (sessionId && !isAborted() && thread.id) {
      threadMap.set(sessionId, { thread, threadId: thread.id });
    }

    if (!isAborted()) {
      yield { type: "status", content: COMPLETED_STATUS };
      yield { type: "done", content: "" };
    }
  } catch (error) {
    if (!isAborted()) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      yield { type: "error", content: errorMessage };
      yield { type: "done", content: "" };
    }
  } finally {
    if (sessionId) {
      abortControllers.delete(sessionId);
      threadMap.delete(sessionId);
    }
  }
};

const abortCodexAgent = (sessionId: string) => {
  const abortController = abortControllers.get(sessionId);
  if (abortController) {
    abortController.abort();
    abortControllers.delete(sessionId);
  }
  threadMap.delete(sessionId);
};

const undoCodexAgent = async (): Promise<void> => {
  if (!lastSessionId) {
    return;
  }

  const threadState = threadMap.get(lastSessionId);
  if (!threadState) {
    return;
  }

  const codex = getCodexInstance();
  const thread = codex.resumeThread(threadState.threadId);
  await thread.run("Please undo the last change you made.");
};

export const codexAgentHandler: AgentHandler = {
  agentId: "codex",
  run: runCodexAgent,
  abort: abortCodexAgent,
  undo: undoCodexAgent,
};
