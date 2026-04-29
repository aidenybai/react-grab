import { Command } from "commander";
import pc from "picocolors";
import { findNearestProjectRoot } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import {
  buildAgentChoices,
  detectInstalledSkillClients,
  getSkillClientNames,
  getSupportedSkillClientNames,
  installSkills,
  readKnownLastSelectedAgents,
  type SkillScope,
} from "../utils/install-skill.js";
import { writeLastSelectedAgents } from "../utils/last-selected-agents.js";
import { logger } from "../utils/logger.js";
import { prompts } from "../utils/prompts.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const SKILL_SCOPES: readonly SkillScope[] = ["global", "project"];

interface InstallSkillCommandOptions {
  yes?: boolean;
  agent?: string[];
  scope?: string;
  cwd: string;
}

const isSkillScope = (value: unknown): value is SkillScope =>
  typeof value === "string" && (SKILL_SCOPES as readonly string[]).includes(value);

const promptForScope = async (): Promise<SkillScope | undefined> => {
  const { selectedScope } = await prompts({
    type: "select",
    name: "selectedScope",
    message: "Where should the React Grab skill be installed?",
    choices: [
      {
        title: "In this project (committed to repo, only this repo's agents see it)",
        value: "project",
      },
      { title: "Globally (per-user, every project sees it)", value: "global" },
    ],
    initial: 0,
  });
  if (selectedScope === undefined) return undefined;
  if (!isSkillScope(selectedScope)) {
    logger.error(`Unexpected scope value from prompt: ${String(selectedScope)}`);
    return undefined;
  }
  return selectedScope;
};

export const installSkill = new Command()
  .name("install-skill")
  .description("install the React Grab skill into your agent's skills directory")
  .option("-y, --yes", "install to detected agents (or all supported) without prompting", false)
  .option(
    "-a, --agent <name...>",
    "install only to the named agent(s) (e.g. --agent Cursor 'Claude Code')",
  )
  .option("-s, --scope <scope>", "install scope: global (per-user) or project (committed to repo)")
  .option("-c, --cwd <cwd>", "working directory used for project-scope installs", process.cwd())
  .action(async (opts: InstallSkillCommandOptions) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      if (opts.scope !== undefined && !isSkillScope(opts.scope)) {
        logger.error(`Invalid --scope "${opts.scope}". Valid values: ${SKILL_SCOPES.join(", ")}.`);
        logger.break();
        process.exit(1);
      }

      const allNames = getSkillClientNames();
      const supportedNames = getSupportedSkillClientNames();
      const flagScope: SkillScope | undefined = isSkillScope(opts.scope) ? opts.scope : undefined;
      // Walk up from cwd to the nearest project root so `install-skill`
      // invoked from a subdirectory inside a repo writes to the canonical
      // `<projectRoot>/.agents/skills/...` location instead of creating a
      // sub-`.agents/skills` that agents won't pick up.
      const projectCwd = findNearestProjectRoot(opts.cwd);

      if (opts.agent && opts.agent.length > 0) {
        const unknown = opts.agent.filter((name) => !allNames.includes(name));
        if (unknown.length > 0) {
          logger.error(`Unknown agent(s): ${unknown.join(", ")}`);
          logger.log(`Supported: ${supportedNames.join(", ")}`);
          logger.break();
          process.exit(1);
        }
        const unsupported = opts.agent.filter((name) => !supportedNames.includes(name));
        if (unsupported.length > 0) {
          logger.error(`Agent(s) do not support skills yet: ${unsupported.join(", ")}`);
          logger.log(`Supported: ${supportedNames.join(", ")}`);
          logger.break();
          process.exit(1);
        }
        const scope: SkillScope = flagScope ?? "project";
        const results = installSkills({ scope, cwd: projectCwd, selectedClients: opts.agent });
        logger.break();
        if (results.some((r) => r.success)) {
          // Only persist the selection when something was actually installed,
          // so a failed run doesn't bias future interactive multiselects.
          writeLastSelectedAgents(opts.agent);
          logger.log("Restart your agent(s) to pick up the new skill.");
        } else {
          logger.error("No skill files were written.");
          logger.break();
          process.exit(1);
        }
        logger.break();
        return;
      }

      let scope: SkillScope;
      if (flagScope) {
        scope = flagScope;
      } else if (opts.yes) {
        scope = "project";
      } else {
        const promptedScope = await promptForScope();
        if (promptedScope === undefined) {
          logger.break();
          process.exit(1);
        }
        scope = promptedScope;
      }

      if (opts.yes) {
        const detected = detectInstalledSkillClients();
        const targets = detected.length > 0 ? detected : supportedNames;
        const results = installSkills({ scope, cwd: projectCwd, selectedClients: targets });
        logger.break();
        if (results.some((r) => r.success)) {
          // Only persist when the user signaled an explicit preference via
          // detection. Wholesale fallback (no detected agents) shouldn't bias
          // future interactive multiselects toward "every supported agent".
          if (detected.length > 0) {
            writeLastSelectedAgents(targets);
          }
          logger.log("Restart your agent(s) to pick up the new skill.");
        } else {
          logger.error("No skill files were written.");
          logger.break();
          process.exit(1);
        }
        logger.break();
        return;
      }

      const detected = detectInstalledSkillClients();
      if (detected.length === 1 && readKnownLastSelectedAgents().length === 0) {
        const onlyDetected = detected[0]!;
        logger.log(
          `Auto-installing to ${highlighter.info(onlyDetected)} (only detected agent). Pass ${highlighter.info("--agent")} to override.`,
        );
        logger.break();
        const results = installSkills({ scope, cwd: projectCwd, selectedClients: [onlyDetected] });
        logger.break();
        if (results.some((r) => r.success)) {
          // Don't persist when the user didn't make an active choice. The
          // auto-install branch routes to the only detected agent without
          // showing a multiselect; persisting it would silently restrict
          // every future interactive run to that single agent.
          logger.log(
            `${highlighter.success("Done.")} Restart your agent to pick up the new skill.`,
          );
        } else {
          logger.error("Skill install failed.");
          logger.break();
          process.exit(1);
        }
        logger.break();
        return;
      }

      const { selectedAgents } = await prompts({
        type: "multiselect",
        name: "selectedAgents",
        message: `Select agents to install the React Grab skill for (${scope}):`,
        choices: buildAgentChoices(scope),
      });

      if (selectedAgents === undefined || selectedAgents.length === 0) {
        // Exit 1 on cancellation so wrapper scripts can distinguish a
        // cancelled multiselect from a successful install. Consistent with
        // the scope-prompt cancellation branch above and with `grab add`,
        // both of which exit non-zero on user-aborted prompts.
        logger.break();
        logger.log("No agents selected. Nothing to do.");
        logger.break();
        process.exit(1);
      }

      logger.break();
      const results = installSkills({ scope, cwd: projectCwd, selectedClients: selectedAgents });
      logger.break();
      if (results.some((r) => r.success)) {
        writeLastSelectedAgents(selectedAgents);
        logger.log(
          `${highlighter.success("Done.")} Restart your agent(s) to pick up the new skill.`,
        );
      } else {
        logger.error("No skill files were written.");
        logger.break();
        process.exit(1);
      }
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
