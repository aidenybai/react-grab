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
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";

const SKILL_NAME = "react-grab";
const WINDSURF_AGENT_NAME = "windsurf";

// The skill is bundled next to the compiled CLI (see scripts/bundle-skill.mjs)
// so installs work offline and stay pinned to this CLI version.
const SKILL_SOURCE = fileURLToPath(new URL("../skills/react-grab", import.meta.url));

const agentLabel = (agent: SkillAgentType): string => getSkillAgentConfig(agent).displayName;

export const getInstallableSkillAgents = <AgentName extends string>(
  agents: readonly AgentName[],
): AgentName[] => agents.filter((agent) => agent !== WINDSURF_AGENT_NAME);

// Universal agents share the canonical .agents/skills directory; others use
// their own. Mirror where agent-install actually writes so removal lands.
const installedSkillDir = (agent: SkillAgentType, global: boolean, cwd: string): string =>
  join(
    isUniversalSkillAgent(agent)
      ? getCanonicalSkillsDir(global, cwd)
      : getSkillAgentDir(agent, { global, cwd }),
    SKILL_NAME,
  );

interface PromptSkillInstallOptions {
  yes?: boolean;
  global?: boolean;
  cwd?: string;
}

export const promptSkillInstall = async ({
  yes = false,
  global = false,
  cwd = process.cwd(),
}: PromptSkillInstallOptions = {}): Promise<boolean> => {
  const detectedAgents = getInstallableSkillAgents(await detectAvailableAgents());
  if (detectedAgents.length === 0) {
    logger.warn("No supported agents detected.");
    return false;
  }

  let selectedAgents = detectedAgents;
  if (!yes) {
    const { confirmed } = await prompts({
      type: "confirm",
      name: "confirmed",
      message: `Install the React Grab skill (${global ? "global" : "this project"})?`,
      initial: true,
    });
    if (!confirmed) return false;

    const { agents } = await prompts({
      type: "multiselect",
      name: "agents",
      message: `Install the React Grab skill (${global ? "global" : "this project"}) for:`,
      choices: detectedAgents.map((agent) => ({
        title: agentLabel(agent),
        value: agent,
        selected: true,
      })),
      instructions: false,
      min: 1,
    });
    selectedAgents = agents ?? [];
    if (selectedAgents.length === 0) return false;
  }

  const installSpinner = spinner("Installing React Grab skill.").start();
  const { installed, failed } = await add({
    source: SKILL_SOURCE,
    agents: selectedAgents,
    global,
    cwd,
    mode: "copy",
  });

  if (installed.length === 0) {
    installSpinner.fail("Failed to install React Grab skill.");
    return false;
  }
  installSpinner.succeed(
    `Installed React Grab skill for ${installed.map((record) => agentLabel(record.agent)).join(", ")}.`,
  );
  for (const record of failed) {
    logger.log(`  ${highlighter.error("\u2717")} ${agentLabel(record.agent)} ${record.error}`);
  }
  return true;
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
}: RemoveSkillOptions = {}): Promise<number> => {
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
  for (const agent of removedAgents) {
    logger.log(`  ${highlighter.success("\u2713")} ${agentLabel(agent)}`);
  }
  return removedAgents.length;
};
