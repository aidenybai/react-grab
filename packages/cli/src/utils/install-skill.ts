import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type SkillAgentType,
  type SkillInstallResult,
  add,
  detectInstalledSkillAgents,
  getCanonicalSkillsDir,
  getSkillAgentConfig,
  getSkillAgentDir,
  isSkillInstalledForAgent,
  isUniversalSkillAgent,
  sanitizeName,
} from "agent-install/skill";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";

const SKILL_NAME = "react-grab";

// The skill is bundled next to the compiled CLI (see scripts/bundle-skill.mjs)
// so installs work offline and stay pinned to this CLI version.
const SKILL_SOURCE = fileURLToPath(new URL("../skills/react-grab", import.meta.url));

// Universal agents share the canonical .agents/skills directory; others use their
// own per-agent skills directory. Mirror where agent-install actually writes.
const getInstalledSkillDir = (agent: SkillAgentType): string => {
  const baseDir = isUniversalSkillAgent(agent)
    ? getCanonicalSkillsDir(true)
    : getSkillAgentDir(agent, { global: true });
  return path.join(baseDir, sanitizeName(SKILL_NAME));
};

const getAgentDisplayName = (agent: SkillAgentType): string => {
  try {
    return getSkillAgentConfig(agent).displayName;
  } catch {
    return agent;
  }
};

export const detectSkillAgents = async (): Promise<SkillAgentType[]> => {
  try {
    return await detectInstalledSkillAgents();
  } catch {
    return [];
  }
};

export const installReactGrabSkill = async (
  agents: SkillAgentType[],
): Promise<SkillInstallResult> => {
  if (!existsSync(SKILL_SOURCE)) {
    throw new Error(`React Grab skill not found at ${SKILL_SOURCE}. Rebuild the CLI.`);
  }

  const installSpinner = spinner("Installing React Grab skill.").start();

  let result: SkillInstallResult;
  try {
    result = await add({ source: SKILL_SOURCE, agents, global: true, mode: "copy" });
  } catch (error) {
    installSpinner.fail("Failed to install React Grab skill.");
    throw error;
  }

  const installedCount = result.installed.length;
  const totalCount = installedCount + result.failed.length;

  if (installedCount === 0) {
    installSpinner.fail("Failed to install React Grab skill.");
  } else if (result.failed.length > 0) {
    installSpinner.warn(`Installed skill to ${installedCount}/${totalCount} agents.`);
  } else {
    installSpinner.succeed(
      `Installed skill to ${installedCount} agent${installedCount === 1 ? "" : "s"}.`,
    );
  }

  for (const record of result.installed) {
    logger.log(
      `  ${highlighter.success("\u2713")} ${getAgentDisplayName(record.agent)} ${highlighter.dim("\u2192")} ${highlighter.dim(record.path)}`,
    );
  }
  for (const record of result.failed) {
    logger.log(
      `  ${highlighter.error("\u2717")} ${getAgentDisplayName(record.agent)} ${highlighter.dim("\u2192")} ${record.error}`,
    );
  }

  return result;
};

export const promptSkillInstall = async (): Promise<boolean> => {
  const detectedAgents = await detectSkillAgents();

  if (detectedAgents.length === 0) {
    logger.warn("No supported agents detected on this machine.");
    return false;
  }

  const { selectedAgents } = await prompts({
    type: "multiselect",
    name: "selectedAgents",
    message: "Select agents to install the React Grab skill for:",
    choices: detectedAgents.map((agent) => ({
      title: getAgentDisplayName(agent),
      value: agent,
      selected: true,
    })),
  });

  if (selectedAgents === undefined || selectedAgents.length === 0) {
    return false;
  }

  logger.break();
  const result = await installReactGrabSkill(selectedAgents);
  return result.installed.length > 0;
};

export const getAgentsWithSkill = async (): Promise<SkillAgentType[]> => {
  const detectedAgents = await detectSkillAgents();
  const checks = await Promise.all(
    detectedAgents.map(async (agent) => ({
      agent,
      installed: await isSkillInstalledForAgent(SKILL_NAME, agent, { global: true }),
    })),
  );
  return checks.filter((check) => check.installed).map((check) => check.agent);
};

export const removeReactGrabSkill = (agents: SkillAgentType[]): SkillAgentType[] => {
  const removedAgents: SkillAgentType[] = [];
  for (const agent of agents) {
    const skillDir = getInstalledSkillDir(agent);
    if (!existsSync(skillDir)) continue;
    rmSync(skillDir, { recursive: true, force: true });
    removedAgents.push(agent);
    logger.log(
      `  ${highlighter.success("\u2713")} ${getAgentDisplayName(agent)} ${highlighter.dim("\u2192")} ${highlighter.dim(skillDir)}`,
    );
  }
  return removedAgents;
};
