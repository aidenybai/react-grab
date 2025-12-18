import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type {
  AgentContext,
  AgentSession,
  AgentOptions,
  OverlayBounds,
} from "./types.js";
import {
  createSession,
  saveSessionById,
  saveSessions,
  loadSessions,
  clearSessions,
  clearSessionById,
  updateSession,
} from "./utils/agent-session.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { generateSnippet } from "./utils/generate-snippet.js";
import { getNearestComponentName } from "./context.js";
import { RECENT_THRESHOLD_MS } from "./constants.js";

interface StartSessionParams {
  element: Element;
  prompt: string;
  position: { x: number; y: number };
  selectionBounds?: OverlayBounds;
  sessionId?: string;
}

export interface AgentManager {
  sessions: Accessor<Map<string, AgentSession>>;
  isProcessing: Accessor<boolean>;
  tryResumeSessions: () => void;
  startSession: (params: StartSessionParams) => Promise<void>;
  abortSession: (sessionId: string) => void;
  abortAllSessions: () => void;
  dismissSession: (sessionId: string) => void;
  undoSession: (sessionId: string) => void;
  acknowledgeSessionError: (sessionId: string) => string | undefined;
  retrySession: (sessionId: string) => void;
  updateSessionBoundsOnViewportChange: () => void;
  getSessionElement: (sessionId: string) => Element | undefined;
  setOptions: (options: AgentOptions) => void;
  getOptions: () => AgentOptions | undefined;
}

export const createAgentManager = (
  initialAgentOptions: AgentOptions | undefined,
): AgentManager => {
  const [sessions, setSessions] = createSignal<Map<string, AgentSession>>(
    new Map(),
  );
  const abortControllers = new Map<string, AbortController>();
  const sessionElements = new Map<string, Element>();

  let agentOptions = initialAgentOptions;

  const setOptions = (options: AgentOptions) => {
    agentOptions = options;
  };

  const getOptions = (): AgentOptions | undefined => {
    return agentOptions;
  };

  const isProcessing = (): boolean =>
    Array.from(sessions().values()).some((session) => session.isStreaming);

  const executeSessionStream = async (
    session: AgentSession,
    streamIterator: AsyncIterable<string>,
  ) => {
    const storage = agentOptions?.storage;
    let wasAborted = false;

    try {
      for await (const status of streamIterator) {
        const currentSessions = sessions();
        const currentSession = currentSessions.get(session.id);
        if (!currentSession) break;

        const updatedSession = updateSession(
          currentSession,
          { lastStatus: status },
          storage,
        );
        setSessions((prev) => new Map(prev).set(session.id, updatedSession));
        agentOptions?.onStatus?.(status, updatedSession);
      }

      const finalSessions = sessions();
      const finalSession = finalSessions.get(session.id);
      if (finalSession) {
        const completionMessage =
          agentOptions?.provider?.getCompletionMessage?.();
        const completedSession = updateSession(
          finalSession,
          {
            isStreaming: false,
            ...(completionMessage ? { lastStatus: completionMessage } : {}),
          },
          storage,
        );
        setSessions((prev) => new Map(prev).set(session.id, completedSession));
        const element = sessionElements.get(session.id);
        const result = await agentOptions?.onComplete?.(
          completedSession,
          element,
        );
        if (result?.error) {
          const errorSession = updateSession(
            completedSession,
            { error: result.error },
            storage,
          );
          setSessions((prev) => new Map(prev).set(session.id, errorSession));
        }
      }
    } catch (error) {
      const currentSessions = sessions();
      const currentSession = currentSessions.get(session.id);
      if (error instanceof Error && error.name === "AbortError") {
        wasAborted = true;
        if (currentSession) {
          const element = sessionElements.get(session.id);
          agentOptions?.onAbort?.(currentSession, element);
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (currentSession) {
          const errorSession = updateSession(
            currentSession,
            {
              error: errorMessage,
              isStreaming: false,
            },
            storage,
          );
          setSessions((prev) => new Map(prev).set(session.id, errorSession));
          if (error instanceof Error) {
            agentOptions?.onError?.(error, errorSession);
          }
        }
      }
    } finally {
      abortControllers.delete(session.id);

      if (wasAborted) {
        sessionElements.delete(session.id);
        clearSessionById(session.id, storage);
        setSessions((prev) => {
          const next = new Map(prev);
          next.delete(session.id);
          return next;
        });
      }
    }
  };

  const tryReacquireElement = (session: AgentSession): Element | undefined => {
    const { selectionBounds, tagName } = session;
    if (!selectionBounds) return undefined;

    const centerX = selectionBounds.x + selectionBounds.width / 2;
    const centerY = selectionBounds.y + selectionBounds.height / 2;

    const element = document.elementFromPoint(centerX, centerY);
    if (!element) return undefined;

    if (tagName && element.tagName.toLowerCase() !== tagName) {
      return undefined;
    }

    return element;
  };

  const tryResumeSessions = () => {
    const storage = agentOptions?.storage;
    if (!storage) {
      return;
    }

    const existingSessions = loadSessions(storage);

    if (existingSessions.size === 0) {
      return;
    }

    const now = Date.now();

    const resumableSessions = Array.from(existingSessions.values()).filter(
      (session) => {
        if (session.isStreaming) return true;
        const lastUpdatedAt = session.lastUpdatedAt ?? session.createdAt;
        const age = now - lastUpdatedAt;
        const isRecent = age < RECENT_THRESHOLD_MS;
        return isRecent && Boolean(session.error);
      },
    );
    if (resumableSessions.length === 0) {
      clearSessions(storage);
      return;
    }
    if (
      !agentOptions?.provider?.supportsResume ||
      !agentOptions.provider.resume
    ) {
      clearSessions(storage);
      return;
    }

    const resumableSessionsMap = new Map(
      resumableSessions.map((session) => [session.id, session]),
    );
    setSessions(resumableSessionsMap);
    saveSessions(resumableSessionsMap, storage);

    for (const existingSession of resumableSessions) {
      const reacquiredElement = tryReacquireElement(existingSession);
      if (reacquiredElement) {
        sessionElements.set(existingSession.id, reacquiredElement);
      }

      const sessionWithResumeStatus = {
        ...existingSession,
        isStreaming: true,
        error: undefined,
        lastStatus: existingSession.lastStatus || "Resuming...",
        position: existingSession.position ?? {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        },
      };
      setSessions((prev) =>
        new Map(prev).set(existingSession.id, sessionWithResumeStatus),
      );
      agentOptions?.onResume?.(sessionWithResumeStatus);

      const abortController = new AbortController();
      abortControllers.set(existingSession.id, abortController);

      const streamIterator = agentOptions.provider.resume(
        existingSession.id,
        abortController.signal,
        storage,
      );
      void executeSessionStream(existingSession, streamIterator);
    }
  };

  const startSession = async (params: StartSessionParams) => {
    const { element, prompt, position, selectionBounds, sessionId } = params;
    const storage = agentOptions?.storage;

    if (!agentOptions?.provider) {
      return;
    }

    const existingSession = sessionId ? sessions().get(sessionId) : undefined;
    const isFollowUp = Boolean(sessionId);

    const content = existingSession
      ? existingSession.context.content
      : await generateSnippet([element], { maxLines: Infinity });

    const context: AgentContext = {
      content,
      prompt,
      options: agentOptions?.getOptions?.() as unknown,
      sessionId: isFollowUp ? sessionId : undefined,
    };

    let session: AgentSession;
    if (existingSession) {
      session = updateSession(
        existingSession,
        {
          context,
          isStreaming: true,
          lastStatus: "Thinking…",
        },
        storage,
      );
    } else {
      const tagName = (element.tagName || "").toLowerCase() || undefined;
      const componentName =
        (await getNearestComponentName(element)) || undefined;

      session = createSession(
        context,
        position,
        selectionBounds,
        tagName,
        componentName,
      );
      session.lastStatus = "Thinking…";
      sessionElements.set(session.id, element);
    }

    setSessions((prev) => new Map(prev).set(session.id, session));
    saveSessionById(session, storage);
    agentOptions.onStart?.(session, element);

    const abortController = new AbortController();
    abortControllers.set(session.id, abortController);

    const contextWithSessionId: AgentContext = {
      ...context,
      sessionId: sessionId ?? session.id,
    };

    const streamIterator = agentOptions.provider.send(
      contextWithSessionId,
      abortController.signal,
    );
    void executeSessionStream(session, streamIterator);
  };

  const abortSession = (sessionId: string) => {
    const controller = abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
  };

  const abortAllSessions = () => {
    abortControllers.forEach((controller) => controller.abort());
    abortControllers.clear();
    setSessions(new Map());
    clearSessions(agentOptions?.storage);
  };

  const dismissSession = (sessionId: string) => {
    const storage = agentOptions?.storage;
    sessionElements.delete(sessionId);
    clearSessionById(sessionId, storage);
    setSessions((prev) => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  };

  const undoSession = (sessionId: string) => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    if (session) {
      const element = sessionElements.get(sessionId);
      agentOptions?.onUndo?.(session, element);
      void agentOptions?.provider?.undo?.();
    }
    dismissSession(sessionId);
  };

  const acknowledgeSessionError = (sessionId: string): string | undefined => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    const prompt = session?.context.prompt;
    dismissSession(sessionId);
    return prompt;
  };

  const retrySession = (sessionId: string) => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    if (!session || !agentOptions?.provider) return;

    const storage = agentOptions.storage;
    const element = sessionElements.get(sessionId);

    const retriedSession = updateSession(
      session,
      {
        error: undefined,
        isStreaming: true,
        lastStatus: "Retrying…",
      },
      storage,
    );

    setSessions((prev) => new Map(prev).set(sessionId, retriedSession));
    saveSessionById(retriedSession, storage);

    if (element) {
      agentOptions.onStart?.(retriedSession, element);
    }

    const abortController = new AbortController();
    abortControllers.set(sessionId, abortController);

    const contextWithSessionId: AgentContext = {
      ...retriedSession.context,
      sessionId,
    };

    const streamIterator = agentOptions.provider.send(
      contextWithSessionId,
      abortController.signal,
    );
    void executeSessionStream(retriedSession, streamIterator);
  };

  const updateSessionBoundsOnViewportChange = () => {
    const currentSessions = sessions();
    if (currentSessions.size === 0) return;

    const updatedSessions = new Map(currentSessions);
    let didUpdate = false;

    for (const [sessionId, session] of currentSessions) {
      const element = sessionElements.get(sessionId);

      if (element && document.contains(element)) {
        const newBounds = createElementBounds(element);
        if (newBounds) {
          const oldBounds = session.selectionBounds;
          let updatedPosition = session.position;

          if (oldBounds) {
            const oldCenterX = oldBounds.x + oldBounds.width / 2;
            const offsetX = session.position.x - oldCenterX;
            const newCenterX = newBounds.x + newBounds.width / 2;
            updatedPosition = { ...session.position, x: newCenterX + offsetX };
          }

          updatedSessions.set(sessionId, {
            ...session,
            selectionBounds: newBounds,
            position: updatedPosition,
          });
          didUpdate = true;
        }
      }
    }

    if (didUpdate) {
      setSessions(updatedSessions);
    }
  };

  const getSessionElement = (sessionId: string): Element | undefined => {
    return sessionElements.get(sessionId);
  };

  return {
    sessions,
    isProcessing,
    tryResumeSessions,
    startSession,
    abortSession,
    abortAllSessions,
    dismissSession,
    undoSession,
    acknowledgeSessionError,
    retrySession,
    updateSessionBoundsOnViewportChange,
    getSessionElement,
    setOptions,
    getOptions,
  };
};
