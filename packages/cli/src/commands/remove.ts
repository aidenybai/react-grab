import { Command } from "commander";
import pc from "picocolors";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { prompts } from "../utils/prompts.js";
import {
  getSupportedSkillClientNames,
  removeSkills,
  type SkillScope,
} from "../utils/install-skill.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const SKILL_SCOPES: readonly SkillScope[] = ["global", "project"];

interface RemoveCommandOptions {
  yes?: boolean;
  agent?: string[];
  scope?: string;
  cwd: string;
}

const isSkillScope = (value: unknown): value is SkillScope =>
  typeof value === "string" && (SKILL_SCOPES as readonly string[]).includes(value);

export const remove = new Command()
  .name("remove")
  .description("remove the React Grab skill from your agent(s)")
  .option("-y, --yes", "remove from all supported agents without prompting", false)
  .option("-a, --agent <name...>", "remove only from the named agent(s)")
  .option("-s, --scope <scope>", "scope to remove from: global or project")
  .option("-c, --cwd <cwd>", "working directory used for project-scope removes", process.cwd())
  .action(async (opts: RemoveCommandOptions) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      if (opts.scope !== undefined && !isSkillScope(opts.scope)) {
        logger.error(`Invalid --scope "${opts.scope}". Valid values: ${SKILL_SCOPES.join(", ")}.`);
        logger.break();
        process.exit(1);
      }

      const supported = getSupportedSkillClientNames();

      let targets: string[];
      if (opts.agent && opts.agent.length > 0) {
        const unsupported = opts.agent.filter((name) => !supported.includes(name));
        if (unsupported.length > 0) {
          logger.error(`Unknown or unsupported agent(s): ${unsupported.join(", ")}`);
          logger.log(`Supported: ${supported.join(", ")}`);
          logger.break();
          process.exit(1);
        }
        targets = opts.agent;
      } else if (opts.yes) {
        targets = supported;
      } else {
        const { selectedAgents } = await prompts({
          type: "multiselect",
          name: "selectedAgents",
          message: "Select agents to remove the React Grab skill from:",
          choices: supported.map((name) => ({
            title: name,
            value: name,
            selected: true,
          })),
        });

        if (selectedAgents === undefined || selectedAgents.length === 0) {
          logger.break();
          logger.log("No agents selected. Nothing to do.");
          logger.break();
          process.exit(0);
        }
        targets = selectedAgents;
      }

      const scopesToTry: SkillScope[] = isSkillScope(opts.scope)
        ? [opts.scope]
        : ["project", "global"];

      const aggregated = scopesToTry.flatMap((scope) =>
        removeSkills({ scope, cwd: opts.cwd, selectedClients: targets }).map((result) => ({
          ...result,
          scope,
        })),
      );

      logger.break();
      for (const result of aggregated) {
        if (result.removed) {
          logger.log(
            `  ${highlighter.success("\u2713")} ${result.client} ${highlighter.dim(`(${result.scope})`)} ${highlighter.dim("\u2192")} removed`,
          );
        } else if (result.deduped) {
          logger.log(
            `  ${highlighter.dim("\u2212")} ${result.client} ${highlighter.dim(`(${result.scope}, shared with another agent)`)}`,
          );
        }
      }
      const removedAny = aggregated.some((result) => result.removed);
      if (!removedAny) {
        logger.log("Nothing to remove.");
      }
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
