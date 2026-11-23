import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import {
  AGENT_LOG_STORAGE_KEY,
  AGENT_LOG_SYNC_RETRY_MS,
  AGENT_LOG_SYNC_WAIT_SECONDS,
  AGENT_TRAY_LINGER_MS,
} from "../constants.js";
import { RecoverableError } from "../errors.js";
import type {
  AgentLogPhase,
  AgentPresenceState,
  AgentTask,
  AgentTaskStatus,
  CommentSubmission,
} from "../types.js";
import { isObjectRecord } from "../utils/is-object-record.js";
import { normalizeErrorMessage } from "../utils/normalize-error.js";
import { reportRecoverableError } from "../utils/report-recoverable-error.js";
import { IS_DEMO } from "../utils/runtime-mode.js";

interface AgentLogControllerOptions {
  getServerUrl: () => string;
}

const AGENT_TASK_STATUSES: AgentTaskStatus[] = ["todo", "in_progress", "done", "error", "canceled"];
const AGENT_PRESENCE_STATES: AgentPresenceState[] = ["none", "listening", "working", "offline"];

const isAgentTaskStatus = (value: unknown): value is AgentTaskStatus =>
  AGENT_TASK_STATUSES.some((status) => status === value);

const isAgentPresenceState = (value: unknown): value is AgentPresenceState =>
  AGENT_PRESENCE_STATES.some((state) => state === value);

const isOpenTask = (task: AgentTask): boolean =>
  task.status === "todo" || task.status === "in_progress";

const loadStoredLogUrl = (): string | null => {
  if (IS_DEMO) return null;
  try {
    return localStorage.getItem(AGENT_LOG_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeLogUrl = (logUrl: string | null) => {
  if (IS_DEMO) return;
  try {
    if (logUrl) localStorage.setItem(AGENT_LOG_STORAGE_KEY, logUrl);
    else localStorage.removeItem(AGENT_LOG_STORAGE_KEY);
  } catch (error) {
    reportRecoverableError(new RecoverableError("Failed to persist agent log link", error));
  }
};

const requestJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const serverMessage =
      isObjectRecord(payload) && typeof payload.error === "string" ? payload.error : null;
    throw new Error(serverMessage ?? `Request failed with status ${response.status}`);
  }
  return payload;
};

const waitWithAbort = (durationMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, durationMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
  });

const parseAgentTask = (rawItem: unknown): AgentTask | null => {
  if (!isObjectRecord(rawItem) || !isObjectRecord(rawItem.comment)) return null;
  if (typeof rawItem.seq_num !== "number" || !isAgentTaskStatus(rawItem.status)) return null;
  const rawElements = rawItem.comment.elements;
  const firstElement = Array.isArray(rawElements) ? rawElements[0] : undefined;
  return {
    seqNum: rawItem.seq_num,
    status: rawItem.status,
    comment: typeof rawItem.comment.comment === "string" ? rawItem.comment.comment : "",
    componentName:
      isObjectRecord(firstElement) && typeof firstElement.componentName === "string"
        ? firstElement.componentName
        : undefined,
    note: typeof rawItem.note === "string" ? rawItem.note : undefined,
  };
};

const buildCommentRecordBody = (submission: CommentSubmission) => ({
  comment: submission.comment,
  content: submission.content,
  page: { url: window.location.href, title: document.title },
  elements: submission.entries.map((entry) => ({
    tagName: entry.tagName,
    componentName: entry.componentName,
    source: entry.source ?? null,
    stackContext: entry.stackContext,
  })),
});

export const createAgentLogController = (options: AgentLogControllerOptions) => {
  const [logUrl, setLogUrl] = createSignal<string | null>(loadStoredLogUrl());
  const [phase, setPhase] = createSignal<AgentLogPhase>("idle");
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [tasks, setTasks] = createSignal<AgentTask[]>([]);
  const [presence, setPresence] = createSignal<AgentPresenceState>("none");
  const [isLingering, setIsLingering] = createSignal(false);
  let lingerTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const hasOpenTasks = createMemo(() => tasks().some(isOpenTask));
  const shouldShowTray = () => Boolean(logUrl()) && (hasOpenTasks() || isLingering());

  const applySnapshot = (payload: unknown) => {
    if (!isObjectRecord(payload) || !Array.isArray(payload.items)) return;
    const hadOpenTasks = hasOpenTasks();
    const nextTasks = payload.items
      .map(parseAgentTask)
      .filter((task): task is AgentTask => task !== null);
    setTasks(nextTasks);
    if (isObjectRecord(payload.agent) && isAgentPresenceState(payload.agent.state)) {
      setPresence(payload.agent.state);
    }
    if (hadOpenTasks && !nextTasks.some(isOpenTask)) {
      clearTimeout(lingerTimeoutId);
      setIsLingering(true);
      lingerTimeoutId = setTimeout(() => setIsLingering(false), AGENT_TRAY_LINGER_MS);
    }
  };

  // Snapshot, then block at the tail until a record (or an agent presence
  // change) arrives, then snapshot again. Each pass is two plain requests, so
  // it survives proxies that don't stream and reconnects after errors.
  const runLiveSync = async (currentLogUrl: string, signal: AbortSignal) => {
    while (!signal.aborted) {
      try {
        const snapshot = await requestJson(`${currentLogUrl}/items`, { signal });
        if (signal.aborted) return;
        applySnapshot(snapshot);
        const tailSeqNum =
          isObjectRecord(snapshot) && isObjectRecord(snapshot.tail)
            ? Number(snapshot.tail.seq_num)
            : 0;
        await requestJson(
          `${currentLogUrl}/records?seq_num=${tailSeqNum}&count=1&wait=${AGENT_LOG_SYNC_WAIT_SECONDS}`,
          { signal },
        );
      } catch (error) {
        if (signal.aborted) return;
        reportRecoverableError(new RecoverableError("Agent log sync failed", error));
        await waitWithAbort(AGENT_LOG_SYNC_RETRY_MS, signal);
      }
    }
  };

  createEffect(() => {
    const currentLogUrl = logUrl();
    if (!currentLogUrl || IS_DEMO) return;
    const syncAbortController = new AbortController();
    void runLiveSync(currentLogUrl, syncAbortController.signal);
    onCleanup(() => syncAbortController.abort());
  });

  onCleanup(() => clearTimeout(lingerTimeoutId));

  const connect = (nextLogUrl: string | null) => {
    storeLogUrl(nextLogUrl);
    clearTimeout(lingerTimeoutId);
    setIsLingering(false);
    setTasks([]);
    setPresence("none");
    setLogUrl(nextLogUrl);
  };

  const generateLink = async () => {
    if (phase() === "generating") return;
    setPhase("generating");
    setErrorMessage(null);
    try {
      const serverUrl = options.getServerUrl().replace(/\/+$/, "");
      const payload = await requestJson(`${serverUrl}/logs`, { method: "POST" });
      if (!isObjectRecord(payload) || typeof payload.url !== "string") {
        throw new Error("Agent log server returned no link");
      }
      connect(payload.url);
      setPhase("idle");
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error, "Could not generate a link"));
      setPhase("failed");
    }
  };

  const disconnect = () => {
    connect(null);
    setPhase("idle");
    setErrorMessage(null);
  };

  const deliverComment = async (submission: CommentSubmission) => {
    const currentLogUrl = logUrl();
    if (!currentLogUrl) throw new Error("No agent connected");
    try {
      await requestJson(`${currentLogUrl}/records`, {
        method: "POST",
        body: JSON.stringify({
          records: [{ headers: { type: "comment" }, body: buildCommentRecordBody(submission) }],
        }),
      });
    } catch (error) {
      reportRecoverableError(new RecoverableError("Failed to send comment to agent log", error));
      throw new Error("Couldn't send to agent");
    }
  };

  return {
    logUrl,
    phase,
    errorMessage,
    tasks,
    presence,
    shouldShowTray,
    generateLink,
    disconnect,
    deliverComment,
  };
};
