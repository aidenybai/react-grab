import type { AgentContext, AgentSession } from "../types.js";

const STORAGE_KEY = "react-grab:agent-session";

const generateSessionId = (): string =>
  `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createSession = (context: AgentContext): AgentSession => ({
  id: generateSessionId(),
  context,
  lastStatus: "",
  isStreaming: true,
  createdAt: Date.now(),
});

const getStorage = (
  storageType: "memory" | "sessionStorage" | "localStorage",
): Storage | null => {
  if (storageType === "memory") return null;
  if (typeof window === "undefined") return null;
  return storageType === "sessionStorage"
    ? window.sessionStorage
    : window.localStorage;
};

let memorySession: AgentSession | null = null;

export const saveSession = (
  session: AgentSession,
  storageType: "memory" | "sessionStorage" | "localStorage" = "memory",
): void => {
  if (storageType === "memory") {
    memorySession = session;
    return;
  }

  const storage = getStorage(storageType);
  if (!storage) {
    memorySession = session;
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    memorySession = session;
  }
};

export const loadSession = (
  storageType: "memory" | "sessionStorage" | "localStorage" = "memory",
): AgentSession | null => {
  if (storageType === "memory") {
    return memorySession;
  }

  const storage = getStorage(storageType);
  if (!storage) {
    return memorySession;
  }

  try {
    const data = storage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as AgentSession;
  } catch {
    return null;
  }
};

export const clearSession = (
  storageType: "memory" | "sessionStorage" | "localStorage" = "memory",
): void => {
  if (storageType === "memory") {
    memorySession = null;
    return;
  }

  const storage = getStorage(storageType);
  if (!storage) {
    memorySession = null;
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    memorySession = null;
  }
};

export const updateSession = (
  session: AgentSession,
  updates: Partial<Pick<AgentSession, "lastStatus" | "isStreaming">>,
  storageType: "memory" | "sessionStorage" | "localStorage" = "memory",
): AgentSession => {
  const updatedSession = { ...session, ...updates };
  saveSession(updatedSession, storageType);
  return updatedSession;
};
