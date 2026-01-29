import fs from "node:fs";
import path from "node:path";
import type { AgentIntegration } from "./templates.js";

const HOOK_COMMAND = "npx @react-grab/agent-hooks run";

type HookTool = "cursor" | "claude-code";

const AGENT_TO_HOOK_TOOL: Partial<Record<AgentIntegration, HookTool>> = {
  cursor: "cursor",
  "claude-code": "claude-code",
};

interface CursorHooksConfig {
  version: number;
  hooks: {
    sessionStart: Array<{ command: string }>;
  };
}

interface ClaudeCodeHooksConfig {
  hooks: {
    SessionStart: Array<{
      hooks: Array<{ type: "command"; command: string }>;
    }>;
  };
}

const generateCursorConfig = (): CursorHooksConfig => ({
  version: 1,
  hooks: {
    sessionStart: [{ command: HOOK_COMMAND }],
  },
});

const generateClaudeCodeConfig = (): ClaudeCodeHooksConfig => ({
  hooks: {
    SessionStart: [
      {
        hooks: [{ type: "command", command: HOOK_COMMAND }],
      },
    ],
  },
});

const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeJsonFile = (filePath: string, data: unknown): void => {
  const dirPath = path.dirname(filePath);
  ensureDir(dirPath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
};

const setupCursorHooks = (projectDir: string): string => {
  const configPath = path.join(projectDir, ".cursor", "hooks.json");
  const config = generateCursorConfig();

  if (fs.existsSync(configPath)) {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const merged = { ...existing, ...config };
    writeJsonFile(configPath, merged);
  } else {
    writeJsonFile(configPath, config);
  }

  return configPath;
};

const setupClaudeCodeHooks = (projectDir: string): string => {
  const configPath = path.join(projectDir, ".claude", "settings.local.json");
  const config = generateClaudeCodeConfig();

  if (fs.existsSync(configPath)) {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const merged = {
      ...existing,
      hooks: {
        ...existing.hooks,
        ...config.hooks,
      },
    };
    writeJsonFile(configPath, merged);
  } else {
    writeJsonFile(configPath, config);
  }

  return configPath;
};

const HOOK_SETUPS: Record<HookTool, (dir: string) => string> = {
  cursor: setupCursorHooks,
  "claude-code": setupClaudeCodeHooks,
};

export const getHookToolForAgent = (agent: AgentIntegration): HookTool | null => {
  return AGENT_TO_HOOK_TOOL[agent] ?? null;
};

export const setupAgentHooks = (
  agent: AgentIntegration,
  projectDir: string,
): { success: boolean; configPath?: string } => {
  const hookTool = getHookToolForAgent(agent);

  if (!hookTool) {
    return { success: false };
  }

  const setup = HOOK_SETUPS[hookTool];
  if (!setup) {
    return { success: false };
  }

  try {
    const configPath = setup(projectDir);
    return { success: true, configPath };
  } catch {
    return { success: false };
  }
};

export const supportsHooks = (agent: AgentIntegration): boolean => {
  return getHookToolForAgent(agent) !== null;
};
