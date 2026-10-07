import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type SkillAgentType,
  add,
  getCanonicalSkillsDir,
  getSkillAgentConfig,
  getSkillAgentDir,
  isUniversalSkillAgent,
} from "agent-install/skill";
import { detectAvailableAgents } from "./detect-agents.js";

const SKILL_NAME = "react-grab";

// The skill is bundled next to the compiled CLI (see scripts/bundle-skill.mjs)
// so installs work offline and stay pinned to this CLI version.
const SKILL_SOURCE = fileURLToPath(new URL("../skills/react-grab", import.meta.url));

export const agentLabel = (agent: SkillAgentType): string => getSkillAgentConfig(agent).displayName;

// Universal agents share the canonical .agents/skills directory; others use
// their own. Mirror where agent-install actually writes so removal lands.
const installedSkillDir = (agent: SkillAgentType, global: boolean, cwd: string): string =>
  join(
    isUniversalSkillAgent(agent)
      ? getCanonicalSkillsDir(global, cwd)
      : getSkillAgentDir(agent, { global, cwd }),
    SKILL_NAME,
  );

export interface InstallSkillOptions {
  agents?: SkillAgentType[];
  global?: boolean;
  cwd?: string;
}

export const installSkill = async ({
  agents,
  global = false,
  cwd = process.cwd(),
}: InstallSkillOptions = {}): Promise<Awaited<ReturnType<typeof add>>> => {
  const targetAgents = agents ?? (await detectAvailableAgents());
  return add({ source: SKILL_SOURCE, agents: targetAgents, global, cwd, mode: "copy" });
};

interface RemoveSkillOptions {
  cwd?: string;
  global?: boolean;
}

// Scoped like install (project unless global) so it won't delete a global install
// from inside an unrelated project.
export const removeSkill = async ({
  cwd = process.cwd(),
  global = false,
}: RemoveSkillOptions = {}): Promise<SkillAgentType[]> => {
  const agents = await detectAvailableAgents();
  const removedAgents: SkillAgentType[] = [];
  const dirsToRemove = new Set<string>();
  for (const agent of agents) {
    const skillDir = installedSkillDir(agent, global, cwd);
    if (!existsSync(skillDir)) continue;
    removedAgents.push(agent);
    dirsToRemove.add(skillDir);
  }
  for (const skillDir of dirsToRemove) {
    rmSync(skillDir, { recursive: true, force: true });
  }
  return removedAgents;
};
