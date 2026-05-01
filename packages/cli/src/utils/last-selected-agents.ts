import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  FALLBACK_STATE_HOME_RELATIVE,
  LAST_SELECTED_AGENTS_FILE,
  STATE_DIR_NAME,
} from "./constants.js";

const getStateDir = (): string => {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  // Per the XDG Base Directory spec, $XDG_STATE_HOME MUST be an absolute path;
  // relative values are ignored. Falls through to ~/.local/state otherwise.
  if (xdgStateHome && path.isAbsolute(xdgStateHome)) {
    return path.join(xdgStateHome, STATE_DIR_NAME);
  }
  return path.join(os.homedir(), FALLBACK_STATE_HOME_RELATIVE, STATE_DIR_NAME);
};

const getStatePath = (): string => path.join(getStateDir(), LAST_SELECTED_AGENTS_FILE);

interface LastSelectedAgentsState {
  agents: string[];
}

const isValidState = (raw: unknown): raw is LastSelectedAgentsState => {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as { agents?: unknown };
  return (
    Array.isArray(candidate.agents) && candidate.agents.every((entry) => typeof entry === "string")
  );
};

export const readLastSelectedAgents = (): string[] => {
  try {
    const content = fs.readFileSync(getStatePath(), "utf8");
    const parsed = JSON.parse(content);
    return isValidState(parsed) ? parsed.agents : [];
  } catch {
    return [];
  }
};

export const writeLastSelectedAgents = (agents: string[]): void => {
  try {
    const stateDir = getStateDir();
    fs.mkdirSync(stateDir, { recursive: true });
    const payload: LastSelectedAgentsState = { agents };
    fs.writeFileSync(getStatePath(), `${JSON.stringify(payload, null, 2)}\n`);
  } catch {
    // State persistence is best-effort: never break the install if we can't
    // write the file (read-only home, sandboxed env, etc.).
  }
};
