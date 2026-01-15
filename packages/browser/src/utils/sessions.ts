import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SESSIONS_DIR = join(tmpdir(), "react-grab-browser-sessions");

interface SessionInfo {
  wsEndpoint: string;
  createdAt: number;
}

const ensureSessionsDir = (): void => {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
};

const getSessionPath = (sessionId: string): string => {
  return join(SESSIONS_DIR, `${sessionId}.json`);
};

export const saveSession = (sessionId: string, wsEndpoint: string): void => {
  ensureSessionsDir();
  const sessionInfo: SessionInfo = {
    wsEndpoint,
    createdAt: Date.now(),
  };
  writeFileSync(getSessionPath(sessionId), JSON.stringify(sessionInfo));
};

export const getSession = (sessionId: string): SessionInfo | null => {
  const sessionPath = getSessionPath(sessionId);
  if (!existsSync(sessionPath)) {
    return null;
  }
  try {
    const content = readFileSync(sessionPath, "utf-8");
    return JSON.parse(content) as SessionInfo;
  } catch {
    return null;
  }
};

export const deleteSession = (sessionId: string): void => {
  const sessionPath = getSessionPath(sessionId);
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
  }
};

export const listSessions = (): string[] => {
  ensureSessionsDir();
  try {
    const files = readdirSync(SESSIONS_DIR);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  } catch {
    return [];
  }
};
