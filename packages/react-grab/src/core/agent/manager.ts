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
import {
  DISMISS_ANIMATION_BUFFER_MS,
  FADE_DURATION_MS,
  RECENT_THRESHOLD_MS,
} from "../../constants.js";

interface StartSessionParams {
  elements: Element[];
  prompt: string;
  position: { x: number; y: number };
  selectionBounds: OverlayBounds[];
  sessionId?: string;
  agent?: AgentOptions;
}

interface AgentManagerHooks {
  transformAgentContext?: (
    context: AgentContext,
    elements: Element[],
  ) => AgentContext | Promise<AgentContext>;
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
  hooks?: AgentManagerHooks,
): AgentManager => {
  const [sessions, setSessions] = createSignal<Map<string, AgentSession>>(
    new Map(),
  );
  const [canUndo, setCanUndo] = createSignal(false);
  const [canRedo, setCanRedo] = createSignal(false);
  const abortControllers = new Map<string, AbortController>();
  const sessionMetadata = new Map<
    string,
    { elements: Element[]; agent: AgentOptions }
  >();
  const undoneSessionsStack: Array<{
    session: AgentSession;
    elements: Element[];
    agent: AgentOptions | undefined;
  }> = [];
  const completedSessionsStack: Array<{
    session: AgentSession;
    elements: Element[];
    agent: AgentOptions | undefined;
  }> = [];

  let agentOptions = initialAgentOptions;

  const getAgentForSession = (sessionId: string): AgentOptions | undefined =>
    sessionMetadata.get(sessionId)?.agent ?? agentOptions;

  const getElementsForSession = (sessionId: string): Element[] =>
    sessionMetadata.get(sessionId)?.elements ?? [];

  const updateUndoRedoState = (agent?: AgentOptions) => {
    const effectiveAgent = agent ?? agentOptions;
    const providerCanUndo = effectiveAgent?.provider?.canUndo?.() ?? false;
    const providerCanRedo = effectiveAgent?.provider?.canRedo?.() ?? false;
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
    activeAgent?: AgentOptions,
  ) => {
    const effectiveAgent = activeAgent ?? agentOptions;
    const storage = effectiveAgent?.storage;
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
        effectiveAgent?.onStatus?.(status, updatedSession);
      }

      const finalSessions = sessions();
      const finalSession = finalSessions.get(session.id);
      if (finalSession) {
        const completionMessage =
          effectiveAgent?.provider?.getCompletionMessage?.();
        const completedSession = updateSession(
          finalSession,
          {
            isStreaming: false,
            ...(completionMessage ? { lastStatus: completionMessage } : {}),
          },
          storage,
        );
        setSessions((prev) => new Map(prev).set(session.id, completedSession));
        const elements = getElementsForSession(session.id);
        const result = await effectiveAgent?.onComplete?.(
          completedSession,
          elements,
        );
        const existingCompletedIndex = completedSessionsStack.findIndex(
          (entry) => entry.session.id === session.id,
        );
        if (existingCompletedIndex !== -1) {
          completedSessionsStack.splice(existingCompletedIndex, 1);
        }
        completedSessionsStack.push({
          session: completedSession,
          elements,
          agent: effectiveAgent,
        });
        updateUndoRedoState(effectiveAgent);
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
          const elements = getElementsForSession(session.id);
          effectiveAgent?.onAbort?.(currentSession, elements);
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
            effectiveAgent?.onError?.(error, errorSession);
          }
        }
      }
    } finally {
      abortControllers.delete(session.id);

      if (wasAborted) {
        sessionMetadata.delete(session.id);
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
      if (reacquiredElement && agentOptions) {
        sessionMetadata.set(existingSession.id, {
          elements: [reacquiredElement],
          agent: agentOptions,
        });
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
    const { elements, prompt, position, selectionBounds, sessionId, agent } =
      params;
    const activeAgent =
      agent ?? (sessionId ? getAgentForSession(sessionId) : agentOptions);
    const storage = activeAgent?.storage;

    if (!activeAgent?.provider || elements.length === 0) {
      return;
    }

    const firstElement = elements[0];
    const existingSession = sessionId ? sessions().get(sessionId) : undefined;
    const isFollowUp = Boolean(sessionId);

    const content = existingSession
      ? existingSession.context.content
      : (await generateSnippet(elements, { maxLines: Infinity })).filter(
          (snippet) => snippet.trim(),
        );

    const context: AgentContext = {
      content,
      prompt,
      options: activeAgent?.getOptions?.(),
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

    sessionMetadata.set(session.id, { elements, agent: activeAgent });
    setSessions((prev) => new Map(prev).set(session.id, session));
    saveSessionById(session, storage);
    activeAgent.onStart?.(session, elements);

    const abortController = new AbortController();
    abortControllers.set(session.id, abortController);

    const contextWithSessionId: AgentContext = {
      ...context,
      sessionId: sessionId ?? session.id,
    };

    let transformedContext: AgentContext;
    try {
      transformedContext = hooks?.transformAgentContext
        ? await hooks.transformAgentContext(contextWithSessionId, elements)
        : contextWithSessionId;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Context transformation failed";
      const errorSession = updateSession(
        session,
        {
          error: errorMessage,
          isStreaming: false,
        },
        storage,
      );
      setSessions((prev) => new Map(prev).set(session.id, errorSession));
      abortControllers.delete(session.id);
      if (error instanceof Error) {
        activeAgent.onError?.(error, errorSession);
      }
      return;
    }

    const streamIterator = activeAgent.provider.send(
      transformedContext,
      abortController.signal,
    );
    void executeSessionStream(session, streamIterator, activeAgent);
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
      sessionMetadata.clear();
      completedSessionsStack.length = 0;
      undoneSessionsStack.length = 0;
      setSessions(new Map());
      clearSessions(agentOptions?.storage);
      updateUndoRedoState();
    }
  };

  const dismissSession = (
    sessionId: string,
    knownAgent?: AgentOptions,
    knownElements?: Element[],
  ) => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    const activeAgent = knownAgent ?? getAgentForSession(sessionId);
    const elements = knownElements ?? getElementsForSession(sessionId);

    if (session?.isFading) return;

    if (session && elements.length > 0) {
      activeAgent?.onDismiss?.(session, elements);
    }

    setSessions((prev) => {
      const next = new Map(prev);
      const existingSession = next.get(sessionId);
      if (existingSession) {
        next.set(sessionId, { ...existingSession, isFading: true });
      }
      return next;
    });

    // HACK: Wait for CSS opacity transition + buffer before removing
    setTimeout(() => {
      const storage = activeAgent?.storage;
      sessionMetadata.delete(sessionId);
      clearSessionById(sessionId, storage);
      setSessions((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
    }, FADE_DURATION_MS + DISMISS_ANIMATION_BUFFER_MS);
  };

  const undoSession = (sessionId: string) => {
    const currentSessions = sessions();
    const session = currentSessions.get(sessionId);
    const activeAgent = getAgentForSession(sessionId);
    const elements = getElementsForSession(sessionId);

    if (session) {
      undoneSessionsStack.push({ session, elements, agent: activeAgent });

      const completedIndex = completedSessionsStack.findIndex(
        (entry) => entry.session.id === sessionId,
      );
      if (completedIndex !== -1) {
        completedSessionsStack.splice(completedIndex, 1);
      }

      activeAgent?.onUndo?.(session, elements);
      void activeAgent?.provider?.undo?.();
    }
    dismissSession(sessionId, activeAgent, elements);
    updateUndoRedoState(activeAgent);
  };

  const globalUndo = () => {
    const completedSessionData = completedSessionsStack.pop();
    if (!completedSessionData) {
      return;
    }

    const { session, elements, agent } = completedSessionData;
    const effectiveAgent = agent ?? agentOptions;

    undoneSessionsStack.push(completedSessionData);
    effectiveAgent?.onUndo?.(session, elements);
    void effectiveAgent?.provider?.undo?.();
    dismissSession(session.id, effectiveAgent, elements);
    updateUndoRedoState(effectiveAgent);
  };

  const globalRedo = () => {
    const undoneSessionData = undoneSessionsStack.pop();
    if (!undoneSessionData) {
      return;
    }

    const effectiveAgent = undoneSessionData.agent ?? agentOptions;
    const { session, elements } = undoneSessionData;

    void effectiveAgent?.provider?.redo?.();

    let validElements = elements.filter((element) =>
      document.contains(element),
    );

    if (validElements.length === 0) {
      const reacquiredElement = tryReacquireElement(session);
      if (reacquiredElement) {
        validElements = [reacquiredElement];
      }
    }

    if (validElements.length > 0 && effectiveAgent) {
      completedSessionsStack.push(undoneSessionData);

      const newBounds = validElements.map((element) =>
        createElementBounds(element),
      );
      const restoredSession: AgentSession = {
        ...session,
        selectionBounds: newBounds,
      };

      sessionMetadata.set(session.id, {
        elements: validElements,
        agent: effectiveAgent,
      });
      setSessions((prev) => new Map(prev).set(session.id, restoredSession));
    }

    updateUndoRedoState(effectiveAgent);
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
    const activeAgent = getAgentForSession(sessionId);
    if (!session || !activeAgent?.provider) return;

    const storage = activeAgent.storage;
    const elements = getElementsForSession(sessionId);

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
      activeAgent.onStart?.(retriedSession, elements);
    }

    const abortController = new AbortController();
    abortControllers.set(sessionId, abortController);

    const contextWithSessionId: AgentContext = {
      ...retriedSession.context,
      sessionId,
    };

    const streamIterator = activeAgent.provider.send(
      contextWithSessionId,
      abortController.signal,
    );
    void executeSessionStream(retriedSession, streamIterator, activeAgent);
  };

  const updateSessionBoundsOnViewportChange = () => {
    const currentSessions = sessions();
    if (currentSessions.size === 0) return;

    const updatedSessions = new Map(currentSessions);
    let didUpdate = false;

    for (const [sessionId, session] of currentSessions) {
      const elements = getElementsForSession(sessionId);
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
            const oldHalfWidth = oldFirstBounds.width / 2;
            const offsetX = session.position.x - oldCenterX;
            const offsetRatio = oldHalfWidth > 0 ? offsetX / oldHalfWidth : 0;
            const newCenterX = newFirstBounds.x + newFirstBounds.width / 2;
            const newHalfWidth = newFirstBounds.width / 2;
            updatedPosition = {
              ...session.position,
              x: newCenterX + offsetRatio * newHalfWidth,
            };
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

  const getSessionElement = (sessionId: string): Element | undefined =>
    getElementsForSession(sessionId)[0];

  const getSessionElements = (sessionId: string): Element[] =>
    getElementsForSession(sessionId);

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
