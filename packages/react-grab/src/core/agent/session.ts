import type {
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  OverlayBounds,
} from "../../types.js";

const STORAGE_KEY = "react-grab:agent-sessions";

const generateSessionId = (): string =>
  `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createSession = (
  context: AgentContext,
  position: { x: number; y: number },
  selectionBounds: OverlayBounds[],
  tagName?: string,
  componentName?: string,
): AgentSession => {
  const now = Date.now();
  return {
    id: generateSessionId(),
    context,
    lastStatus: "",
    isStreaming: true,
    createdAt: now,
    lastUpdatedAt: now,
    position,
    selectionBounds,
    tagName,
    componentName,
  };
};

const memorySessions = new Map<string, AgentSession>();

export const saveSessions = (
  sessions: Map<string, AgentSession>,
  storage?: AgentSessionStorage | null,
): void => {
  if (!storage) {
    memorySessions.clear();
    sessions.forEach((session, id) => memorySessions.set(id, session));
    return;
  }

  try {
    const sessionsObject = Object.fromEntries(sessions);
    storage.setItem(STORAGE_KEY, JSON.stringify(sessionsObject));
  } catch {
    memorySessions.clear();
    sessions.forEach((session, id) => memorySessions.set(id, session));
  }
};

export const saveSessionById = (
  session: AgentSession,
  storage?: AgentSessionStorage | null,
): void => {
  const sessions = loadSessions(storage);
  sessions.set(session.id, session);
  saveSessions(sessions, storage);
};

export const loadSessions = (
  storage?: AgentSessionStorage | null,
): Map<string, AgentSession> => {
  if (!storage) {
    return new Map(memorySessions);
  }

  try {
    const data = storage.getItem(STORAGE_KEY);
    if (!data) return new Map();
    const sessionsObject = JSON.parse(data) as Record<string, AgentSession>;
    return new Map(Object.entries(sessionsObject));
  } catch {
    return new Map();
  }
};

export const clearSessions = (storage?: AgentSessionStorage | null): void => {
  if (!storage) {
    memorySessions.clear();
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    memorySessions.clear();
  }
};

export const clearSessionById = (
  sessionId: string,
  storage?: AgentSessionStorage | null,
): void => {
  const sessions = loadSessions(storage);
  sessions.delete(sessionId);
  saveSessions(sessions, storage);
};

export const updateSession = (
  session: AgentSession,
  updates: Partial<
    Pick<AgentSession, "lastStatus" | "isStreaming" | "error" | "context">
  >,
  storage?: AgentSessionStorage | null,
): AgentSession => {
  const updatedSession = { ...session, ...updates, lastUpdatedAt: Date.now() };
  saveSessionById(updatedSession, storage);
  return updatedSession;
};



