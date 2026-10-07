import { detectAvailableAgents } from "./detect-agents.js";
import { highlighter } from "./highlighter.js";
import { agentLabel, installSkill } from "./install-skill.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";

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
  const detectedAgents = await detectAvailableAgents();
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
  const { installed, failed } = await installSkill({ agents: selectedAgents, global, cwd });

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
