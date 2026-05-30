import { accessSync, constants, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
  type SkillAgentType,
  detectInstalledSkillAgents,
  getSkillAgentTypes,
} from "agent-install/skill";

// PATH binaries used as a supplementary detection signal on top of
// agent-install's filesystem detection. This catches users who installed a
// CLI but have not run it yet (no ~/.claude / ~/.cursor / etc. on disk).
// Only agents whose CLI ships an obvious binary name are listed; FS-only
// agents rely entirely on agent-install. "universal" is a synthetic install
// target with no binary or config dir.
const PATH_BINARIES: Partial<Record<SkillAgentType, readonly string[]>> = {
  "claude-code": ["claude"],
  codex: ["codex"],
  cursor: ["cursor", "cursor-agent"],
  droid: ["droid"],
  "gemini-cli": ["gemini"],
  "github-copilot": ["copilot"],
  opencode: ["opencode"],
  pi: ["pi", "omegon"],
};

const isCommandAvailable = (command: string): boolean => {
  const pathDirectories = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const directory of pathDirectories) {
    const binaryPath = join(directory, command);
    try {
      if (statSync(binaryPath).isFile()) {
        accessSync(binaryPath, constants.X_OK);
        return true;
      }
    } catch {}
  }
  return false;
};

// Union of agent-install's filesystem-detected agents (~/.claude, ~/.cursor,
// etc.) with a supplementary $PATH binary scan that catches agents installed
// but not yet run (no config dir on disk). Order follows getSkillAgentTypes()
// for deterministic UI; the synthetic "universal" type is filtered out because
// it is not a user-facing agent.
export const detectAvailableAgents = async (): Promise<SkillAgentType[]> => {
  const installedAgents = new Set(await detectInstalledSkillAgents());
  return getSkillAgentTypes().filter((agent) => {
    if (agent === "universal") return false;
    if (installedAgents.has(agent)) return true;
    return PATH_BINARIES[agent]?.some(isCommandAvailable) ?? false;
  });
};
