import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type {
  AgentContext,
  AgentSession,
  AgentOptions,
  OverlayBounds,
} from "../../types.js";
import {
  createSession,
  saveSessionById,
  saveSessions,
  loadSessions,
  clearSessions,
  clearSessionById,
  updateSession,
} from "./session.js";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import { generateSnippet } from "../../utils/generate-snippet.js";
import { getNearestComponentName } from "../context.js";
import { RECENT_THRESHOLD_MS } from "../../constants.js";

interface StartSessionParams {
  elements: Element[];
  prompt: string;
  position: { x: number; y: number };
  selectionBounds: OverlayBounds[];
  sessionId?: string;
}

interface SessionOperations {
  start: (params: StartSessionParams) => Promise<void>;
  abort: (sessionId?: string) => void;
  dismiss: (sessionId: string) => void;
  retry: (sessionId: string) => void;
  undo: (sessionId: string) => void;
  getElement: (sessionId: string) => Element | undefined;
  getElements: (sessionId: string) => Element[];
  tryResume: () => void;
  acknowledgeError: (sessionId: string) => string | undefined;
}

interface HistoryOperations {
  undo: () => void;
  redo: () => void;
}

interface InternalOperations {
  updateBoundsOnViewportChange: () => void;
  setOptions: (options: AgentOptions) => void;
  getOptions: () => AgentOptions | undefined;
}

export interface AgentManager {
  sessions: Accessor<Map<string, AgentSession>>;
  isProcessing: Accessor<boolean>;
  canUndo: Accessor<boolean>;
  canRedo: Accessor<boolean>;
  session: SessionOperations;
  history: HistoryOperations;
  _internal: InternalOperations;
}

export const createAgentManager = (
  initialAgentOptions: AgentOptions | undefined,
): AgentManager => {
  const [sessions, setSessions] = createSignal<Map<string, AgentSession>>(
    new Map(),
  );
  const [canUndo, setCanUndo] = createSignal(false);
  const [canRedo, setCanRedo] = createSignal(false);
  const abortControllers = new Map<string, AbortController>();
  const sessionElements = new Map<string, Element[]>();
  const undoneSessionsStack: Array<{
    session: AgentSession;
    elements: Element[];
  }> = [];

  let agentOptions = initialAgentOptions;

  const updateUndoRedoState = () => {
    const providerCanUndo = agentOptions?.provider?.canUndo?.() ?? false;
    const providerCanRedo = agentOptions?.provider?.canRedo?.() ?? false;
    setCanUndo(providerCanUndo);
    setCanRedo(providerCanRedo);
  };

  const setOptions = (options: AgentOptions) => {
    agentOptions = options;
    updateUndoRedoState();
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
        const elements = sessionElements.get(session.id) ?? [];
        const result = await agentOptions?.onComplete?.(
          completedSession,
          elements,
        );
        updateUndoRedoState();
        undoneSessionsStack.length = 0;
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
          const elements = sessionElements.get(session.id) ?? [];
          agentOptions?.onAbort?.(currentSession, elements);
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
    const firstBounds = selectionBounds[0];
    if (!firstBounds) return undefined;

    const centerX = firstBounds.x + firstBounds.width / 2;
    const centerY = firstBounds.y + firstBounds.height / 2;

    const element = document.elementFromPoint(centerX, centerY);
    if (!element) return undefined;

    const isValidHtmlTagName = tagName && !tagName.includes(" ");
    if (isValidHtmlTagName && element.tagName.toLowerCase() !== tagName) {
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
        sessionElements.set(existingSession.id, [reacquiredElement]);
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
    const { elements, prompt, position, selectionBounds, sessionId } = params;
    const storage = agentOptions?.storage;

    if (!agentOptions?.provider || elements.length === 0) {
      return;
    }

    const firstElement = elements[0];
    const existingSession = sessionId ? sessions().get(sessionId) : undefined;
    const isFollowUp = Boolean(sessionId);

    const content = existingSession
      ? existingSession.context.content
      : await generateSnippet(elements, { maxLines: Infinity });

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
      const tagName =
        elements.length > 1
          ? `${elements.length} elements`
          : (firstElement.tagName || "").toLowerCase() || undefined;
      const componentName =
        elements.length > 1
          ? undefined
          : (await getNearestComponentName(firstElement)) || undefined;

      session = createSession(
        context,
        position,
        selectionBounds,
        tagName,
        componentName,
      );
      session.lastStatus = "Thinking…";
    }

    sessionElements.set(session.id, elements);
    setSessions((prev) => new Map(prev).set(session.id, session));
    saveSessionById(session, storage);
    agentOptions.onStart?.(session, elements);

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

  const abort = (sessionId?: string) => {
    if (sessionId) {
      const controller = abortControllers.get(sessionId);
      if (controller) {
        controller.abort();
      }
    } else {
      abortControllers.forEach((controller) => controller.abort());
      abortControllers.clear();
      setSessions(new Map());
      clearSessions(agentOptions?.storage);
    }
  };

  const dismissSession = (sessionId: string) => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    const elements = sessionElements.get(sessionId) ?? [];
    if (session && elements.length > 0) {
      agentOptions?.onDismiss?.(session, elements);
    }
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
      const elements = sessionElements.get(sessionId) ?? [];
      undoneSessionsStack.push({ session, elements });
      agentOptions?.onUndo?.(session, elements);
      void agentOptions?.provider?.undo?.();
    }
    dismissSession(sessionId);
    updateUndoRedoState();
  };

  const globalUndo = () => {
    void agentOptions?.provider?.undo?.();
    updateUndoRedoState();
  };

  const globalRedo = () => {
    const undoneSessionData = undoneSessionsStack.pop();
    void agentOptions?.provider?.redo?.();

    if (undoneSessionData) {
      const { session, elements } = undoneSessionData;
      const validElements = elements.filter((el) => document.contains(el));

      if (validElements.length > 0) {
        const newBounds = validElements.map((el) => createElementBounds(el));
        const restoredSession: AgentSession = {
          ...session,
          selectionBounds: newBounds,
        };

        sessionElements.set(session.id, validElements);
        setSessions((prev) => new Map(prev).set(session.id, restoredSession));
      }
    }

    updateUndoRedoState();
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
    const elements = sessionElements.get(sessionId) ?? [];

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

    if (elements.length > 0) {
      agentOptions.onStart?.(retriedSession, elements);
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
      const elements = sessionElements.get(sessionId) ?? [];
      const firstElement = elements[0];

      if (firstElement && document.contains(firstElement)) {
        const newBounds = elements
          .filter((el) => document.contains(el))
          .map((el) => createElementBounds(el));

        if (newBounds.length > 0) {
          const oldFirstBounds = session.selectionBounds[0];
          const newFirstBounds = newBounds[0];
          let updatedPosition = session.position;

          if (oldFirstBounds && newFirstBounds) {
            const oldCenterX = oldFirstBounds.x + oldFirstBounds.width / 2;
            const offsetX = session.position.x - oldCenterX;
            const newCenterX = newFirstBounds.x + newFirstBounds.width / 2;
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
    const elements = sessionElements.get(sessionId);
    return elements?.[0];
  };

  const getSessionElements = (sessionId: string): Element[] => {
    return sessionElements.get(sessionId) ?? [];
  };

  return {
    sessions,
    isProcessing,
    canUndo,
    canRedo,
    session: {
      start: startSession,
      abort,
      dismiss: dismissSession,
      retry: retrySession,
      undo: undoSession,
      getElement: getSessionElement,
      getElements: getSessionElements,
      tryResume: tryResumeSessions,
      acknowledgeError: acknowledgeSessionError,
    },
    history: {
      undo: globalUndo,
      redo: globalRedo,
    },
    _internal: {
      updateBoundsOnViewportChange: updateSessionBoundsOnViewportChange,
      setOptions,
      getOptions,
    },
  };
};

