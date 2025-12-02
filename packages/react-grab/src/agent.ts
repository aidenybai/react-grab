import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { AgentSession, AgentOptions, OverlayBounds } from "./types.js";
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

interface StartSessionParams {
  element: Element;
  prompt: string;
  position: { x: number; y: number };
  selectionBounds?: OverlayBounds;
}

export interface AgentManager {
  sessions: Accessor<Map<string, AgentSession>>;
  isProcessing: Accessor<boolean>;
  tryResumeSessions: () => void;
  startSession: (params: StartSessionParams) => Promise<void>;
  abortAllSessions: () => void;
  updateSessionBoundsOnViewportChange: () => void;
  getSessionElement: (sessionId: string) => Element | undefined;
}

export const createAgentManager = (
  agentOptions: AgentOptions | undefined,
): AgentManager => {
  const [sessions, setSessions] = createSignal<Map<string, AgentSession>>(new Map());
  const abortControllers = new Map<string, AbortController>();
  const sessionElements = new Map<string, Element>();

  const isProcessing = (): boolean => sessions().size > 0;

  const executeSessionStream = async (
    session: AgentSession,
    streamIterator: AsyncIterable<string>,
  ) => {
    const storage = agentOptions?.storage;
    let didComplete = false;
    let wasAborted = false;
    let hadError = false;

    try {
      for await (const status of streamIterator) {
        const currentSessions = sessions();
        const currentSession = currentSessions.get(session.id);
        if (!currentSession) break;

        const updatedSession = updateSession(currentSession, { lastStatus: status }, storage);
        setSessions((prev) => new Map(prev).set(session.id, updatedSession));
        agentOptions?.onStatus?.(status, updatedSession);
      }

      didComplete = true;
      const finalSessions = sessions();
      const finalSession = finalSessions.get(session.id);
      if (finalSession) {
        const completedSession = updateSession(finalSession, { isStreaming: false }, storage);
        setSessions((prev) => new Map(prev).set(session.id, completedSession));
        agentOptions?.onComplete?.(completedSession);
      }
    } catch (error) {
      const currentSessions = sessions();
      const currentSession = currentSessions.get(session.id);
      if (error instanceof Error && error.name === "AbortError") {
        wasAborted = true;
      } else {
        hadError = true;
        if (currentSession) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const errorSession = updateSession(currentSession, {
            lastStatus: `Error: ${errorMessage}`,
            isStreaming: false,
          }, storage);
          setSessions((prev) => new Map(prev).set(session.id, errorSession));
          if (error instanceof Error) {
            agentOptions?.onError?.(error, errorSession);
          }
        }
      }
    } finally {
      abortControllers.delete(session.id);

      const removeSession = () => {
        sessionElements.delete(session.id);
        clearSessionById(session.id, storage);
        setSessions((prev) => {
          const next = new Map(prev);
          next.delete(session.id);
          return next;
        });
      };

      if (didComplete || hadError) {
        // HACK: Delay removal to show "Complete!" or error message for 1.5 seconds
        setTimeout(removeSession, 1500);
      } else if (wasAborted) {
        removeSession();
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
    const existingSessions = loadSessions(storage);

    const streamingSessions = Array.from(existingSessions.values()).filter(
      (session) => session.isStreaming,
    );
    if (streamingSessions.length === 0) {
      clearSessions(storage);
      return;
    }
    if (!agentOptions?.provider?.supportsResume || !agentOptions.provider.resume) {
      clearSessions(storage);
      return;
    }

    const streamingSessionsMap = new Map(
      streamingSessions.map((session) => [session.id, session]),
    );
    setSessions(streamingSessionsMap);
    saveSessions(streamingSessionsMap, storage);

    for (const existingSession of streamingSessions) {
      const reacquiredElement = tryReacquireElement(existingSession);
      if (reacquiredElement) {
        sessionElements.set(existingSession.id, reacquiredElement);
      }

      const sessionWithResumeStatus = {
        ...existingSession,
        lastStatus: existingSession.lastStatus || "Resuming...",
        position: existingSession.position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      };
      setSessions((prev) => new Map(prev).set(existingSession.id, sessionWithResumeStatus));
      agentOptions?.onResume?.(sessionWithResumeStatus);

      const abortController = new AbortController();
      abortControllers.set(existingSession.id, abortController);

      const streamIterator = agentOptions.provider.resume(existingSession.id, abortController.signal);
      void executeSessionStream(existingSession, streamIterator);
    }
  };

  const startSession = async (params: StartSessionParams) => {
    const { element, prompt, position, selectionBounds } = params;
    const storage = agentOptions?.storage;

    if (!agentOptions?.provider) {
      return;
    }

    const elements = [element];
    const content = await generateSnippet(elements);
    const context = { content, prompt, options: agentOptions?.getOptions?.() };
    const tagName = (element.tagName || "").toLowerCase() || undefined;

    const session = createSession(context, position, selectionBounds, tagName);
    session.lastStatus = "Please wait…";
    sessionElements.set(session.id, element);
    setSessions((prev) => new Map(prev).set(session.id, session));
    saveSessionById(session, storage);
    agentOptions.onStart?.(session);

    const abortController = new AbortController();
    abortControllers.set(session.id, abortController);

    const streamIterator = agentOptions.provider.send(context, abortController.signal);
    void executeSessionStream(session, streamIterator);
  };

  const abortAllSessions = () => {
    abortControllers.forEach((controller) => controller.abort());
    abortControllers.clear();
    setSessions(new Map());
    clearSessions(agentOptions?.storage);
  };

  const updateSessionBoundsOnViewportChange = () => {
    const currentSessions = sessions();
    if (currentSessions.size === 0) return;

    const updatedSessions = new Map(currentSessions);
    let didUpdate = false;

    for (const [sessionId, session] of currentSessions) {
      let element = sessionElements.get(sessionId);

      if (!element || !document.contains(element)) {
        const reacquiredElement = tryReacquireElement(session);
        if (reacquiredElement) {
          sessionElements.set(sessionId, reacquiredElement);
          element = reacquiredElement;
        }
      }

      if (element && document.contains(element)) {
        const newBounds = createElementBounds(element);
        if (newBounds) {
          updatedSessions.set(sessionId, { ...session, selectionBounds: newBounds });
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
    abortAllSessions,
    updateSessionBoundsOnViewportChange,
    getSessionElement,
  };
};
