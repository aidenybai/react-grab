import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type SkillAgentType,
  add,
  detectInstalledSkillAgents,
  getCanonicalSkillsDir,
  getSkillAgentConfig,
  getSkillAgentDir,
  isUniversalSkillAgent,
} from "agent-install/skill";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";

const SKILL_NAME = "react-grab";

// The skill is bundled next to the compiled CLI (see scripts/bundle-skill.mjs)
// so installs work offline and stay pinned to this CLI version.
const SKILL_SOURCE = fileURLToPath(new URL("../skills/react-grab", import.meta.url));

const agentLabel = (agent: SkillAgentType): string => getSkillAgentConfig(agent).displayName;

// Universal agents share the canonical .agents/skills directory; others use
// their own. Mirror where agent-install actually writes so removal lands.
const installedSkillDir = (agent: SkillAgentType): string =>
  join(
    isUniversalSkillAgent(agent)
      ? getCanonicalSkillsDir(true)
      : getSkillAgentDir(agent, { global: true }),
    SKILL_NAME,
  );

export const promptSkillInstall = async ({ yes = false } = {}): Promise<boolean> => {
  const agents = await detectInstalledSkillAgents();
  if (agents.length === 0) {
    logger.warn("No supported agents detected.");
    return false;
  }

  if (!yes) {
    const { confirmed } = await prompts({
      type: "confirm",
      name: "confirmed",
      message: `Install the React Grab skill for ${highlighter.info(agents.map(agentLabel).join(", "))}?`,
      initial: true,
    });
    if (!confirmed) return false;
  }

  const installSpinner = spinner("Installing React Grab skill.").start();
  const { installed, failed } = await add({
    source: SKILL_SOURCE,
    agents,
    global: true,
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

export const removeSkill = async (): Promise<number> => {
  const agents = await detectInstalledSkillAgents();
  let removedCount = 0;
  for (const agent of agents) {
    const skillDir = installedSkillDir(agent);
    if (!existsSync(skillDir)) continue;
    rmSync(skillDir, { recursive: true, force: true });
    logger.log(`  ${highlighter.success("\u2713")} ${agentLabel(agent)}`);
    removedCount += 1;
  }
  return removedCount;
};
