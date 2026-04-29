import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";
import { SKILL_TEMPLATE } from "./skill-template.js";
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR, SKILL_NAME } from "./constants.js";
import { readLastSelectedAgents, writeLastSelectedAgents } from "./last-selected-agents.js";

export type SkillScope = "global" | "project";

export interface SkillClientDefinition {
  name: string;
  universal: boolean;
  globalRoot: string | null;
  projectRoot: string | null;
  detectInstalled: () => boolean;
  supported: boolean;
  unsupportedReason?: string;
}

export interface InstallResult {
  client: string;
  skillPath: string;
  success: boolean;
  skipped?: boolean;
  deduped?: boolean;
  error?: string;
}

export interface RemoveResult {
  client: string;
  skillRoot: string;
  removed: boolean;
  deduped?: boolean;
  sharedWith?: string[];
}

export interface InstallSkillsOptions {
  scope: SkillScope;
  cwd: string;
  selectedClients?: string[];
}

export interface RemoveSkillsOptions {
  scope: SkillScope;
  cwd: string;
  selectedClients?: string[];
}

export interface AgentChoice {
  title: string;
  value: string;
  selected: boolean;
}

const getXdgConfigHome = (): string =>
  process.env.XDG_CONFIG_HOME?.trim() || path.join(os.homedir(), ".config");

const getClaudeHome = (): string =>
  process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(os.homedir(), ".claude");

const getCodexHome = (): string =>
  process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex");

const getCanonicalGlobalRoot = (): string =>
  path.join(os.homedir(), CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR);

const universalClient = (name: string, detectInstalled: () => boolean): SkillClientDefinition => ({
  name,
  universal: true,
  globalRoot: getCanonicalGlobalRoot(),
  projectRoot: path.join(CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR),
  detectInstalled,
  supported: true,
});

const unsupportedClient = (name: string, reason: string): SkillClientDefinition => ({
  name,
  universal: false,
  globalRoot: null,
  projectRoot: null,
  detectInstalled: () => false,
  supported: false,
  unsupportedReason: reason,
});

export const getSkillClients = (): SkillClientDefinition[] => {
  const homeDir = os.homedir();
  const claudeHome = getClaudeHome();
  const codexHome = getCodexHome();
  const xdgConfigHome = getXdgConfigHome();

  return [
    {
      name: "Claude Code",
      universal: false,
      globalRoot: path.join(claudeHome, "skills"),
      projectRoot: ".claude/skills",
      detectInstalled: () => fs.existsSync(claudeHome),
      supported: true,
    },
    universalClient("Cursor", () => fs.existsSync(path.join(homeDir, ".cursor"))),
    universalClient("Codex", () => fs.existsSync(codexHome)),
    universalClient("OpenCode", () => fs.existsSync(path.join(xdgConfigHome, "opencode"))),
    // Amp is universal at project scope (`.agents/skills/`) but reads
    // user-level skills from `~/.config/agents/skills/` rather than
    // `~/.agents/skills/`. Set both explicitly so project installs still
    // dedup against the canonical root, while global installs land where
    // Amp will actually find them.
    {
      name: "Amp",
      universal: false,
      globalRoot: path.join(xdgConfigHome, "agents", "skills"),
      projectRoot: path.join(CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR),
      detectInstalled: () => fs.existsSync(path.join(xdgConfigHome, "amp")),
      supported: true,
    },
    universalClient("Gemini CLI", () => fs.existsSync(path.join(homeDir, ".gemini"))),
    universalClient("GitHub Copilot", () => fs.existsSync(path.join(homeDir, ".copilot"))),
    universalClient("Warp", () => fs.existsSync(path.join(homeDir, ".warp"))),
    universalClient("Windsurf", () => fs.existsSync(path.join(homeDir, ".codeium", "windsurf"))),
    universalClient("Pi", () => fs.existsSync(path.join(homeDir, ".pi"))),
    {
      name: "Droid",
      universal: false,
      globalRoot: path.join(homeDir, ".factory", "skills"),
      projectRoot: ".factory/skills",
      detectInstalled: () => fs.existsSync(path.join(homeDir, ".factory")),
      supported: true,
    },
    unsupportedClient(
      "VS Code",
      "VS Code does not yet support skills. Run `react-grab log` directly.",
    ),
    unsupportedClient("Zed", "Zed does not yet support skills. Run `react-grab log` directly."),
    unsupportedClient(
      "Cline",
      "Cline reads from .cline/skills/, not the canonical .agents/skills/. React Grab no longer auto-installs to Cline; copy the skill template into your Cline skills directory manually if needed.",
    ),
  ];
};

export const getSkillClientNames = (): string[] => getSkillClients().map((client) => client.name);

export const getSupportedSkillClientNames = (): string[] =>
  getSkillClients()
    .filter((client) => client.supported)
    .map((client) => client.name);

// Wrap `readLastSelectedAgents` so callers always get a list pruned to the
// currently-known client roster. Without this, a stale entry for a client
// that has since been removed would skew the `lastSelected.length === 0`
// short-circuits used by the install flow, and would keep the multiselect's
// "user has a saved choice" branch active when none of the saved choices
// map to a real agent anymore.
export const readKnownLastSelectedAgents = (): string[] => {
  const known = new Set(getSkillClientNames());
  return readLastSelectedAgents().filter((name) => known.has(name));
};

export const detectInstalledSkillClients = (): string[] =>
  getSkillClients()
    .filter((client) => client.supported && client.detectInstalled())
    .map((client) => client.name);

export const resolveSkillRoot = (
  client: SkillClientDefinition,
  scope: SkillScope,
  cwd: string,
): string | null => {
  if (!client.supported) return null;
  if (scope === "global") return client.globalRoot;
  if (!client.projectRoot) return null;
  return path.resolve(cwd, client.projectRoot);
};

const ensureDirectory = (filePath: string): void => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const skillFilePathFor = (skillRoot: string): string =>
  path.join(skillRoot, SKILL_NAME, "SKILL.md");

export const writeSkillFile = (skillRoot: string): string => {
  const skillFilePath = skillFilePathFor(skillRoot);
  ensureDirectory(skillFilePath);
  fs.writeFileSync(skillFilePath, SKILL_TEMPLATE);
  return skillFilePath;
};

export const skillFileExists = (skillRoot: string): boolean => {
  const skillDirectory = path.join(skillRoot, SKILL_NAME);
  return fs.existsSync(skillDirectory);
};

export const removeSkillFile = (skillRoot: string): boolean => {
  const skillDirectory = path.join(skillRoot, SKILL_NAME);
  if (!fs.existsSync(skillDirectory)) return false;
  fs.rmSync(skillDirectory, { recursive: true, force: true });
  return true;
};

const filterClientsByName = (
  clients: SkillClientDefinition[],
  selectedClients: string[] | undefined,
): SkillClientDefinition[] =>
  selectedClients ? clients.filter((client) => selectedClients.includes(client.name)) : clients;

const buildSkippedResult = (client: SkillClientDefinition): InstallResult => ({
  client: client.name,
  skillPath: "",
  success: false,
  skipped: true,
  error: client.unsupportedReason ?? "Unsupported client.",
});

export const installSkills = (options: InstallSkillsOptions): InstallResult[] => {
  const { scope, cwd, selectedClients } = options;
  const clients = filterClientsByName(getSkillClients(), selectedClients);
  const writtenRoots = new Set<string>();
  const results: InstallResult[] = [];

  const installSpinner = spinner(`Installing react-grab skill (${scope}).`).start();

  for (const client of clients) {
    const skillRoot = resolveSkillRoot(client, scope, cwd);
    if (skillRoot === null) {
      results.push(buildSkippedResult(client));
      continue;
    }

    const skillPath = skillFilePathFor(skillRoot);

    if (writtenRoots.has(skillRoot)) {
      results.push({ client: client.name, skillPath, success: true, deduped: true });
      continue;
    }

    try {
      writeSkillFile(skillRoot);
      writtenRoots.add(skillRoot);
      results.push({ client: client.name, skillPath, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        client: client.name,
        skillPath,
        success: false,
        error: message,
      });
    }
  }

  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.filter((result) => !result.success && !result.skipped).length;
  const skippedCount = results.filter((result) => result.skipped).length;
  const uniqueWriteCount = writtenRoots.size;

  if (failureCount > 0) {
    installSpinner.warn(
      `Installed to ${successCount}/${results.length - skippedCount} agents. ${failureCount} failed.`,
    );
  } else if (successCount === 0) {
    // Every selected client was skipped (e.g. unsupported / no install
    // location). A green "Installed to 0 agents." spinner would contradict
    // the per-client "skipped" lines printed below and the eventual non-zero
    // exit, so flag it as a failure up front.
    installSpinner.fail(
      skippedCount > 0 ? `No agents installed (${skippedCount} skipped).` : "No agents installed.",
    );
  } else {
    installSpinner.succeed(
      uniqueWriteCount === successCount
        ? `Installed to ${successCount} agents.`
        : `Installed to ${successCount} agents (${uniqueWriteCount} unique skill file${uniqueWriteCount === 1 ? "" : "s"}).`,
    );
  }

  for (const result of results) {
    if (result.success) {
      const note = result.deduped ? ` ${highlighter.dim("(shared)")}` : "";
      logger.log(
        `  ${highlighter.success("\u2713")} ${result.client} ${highlighter.dim("\u2192")} ${highlighter.dim(result.skillPath)}${note}`,
      );
    } else if (result.skipped) {
      logger.log(
        `  ${highlighter.dim("\u2212")} ${result.client} ${highlighter.dim("(skipped)")} ${highlighter.dim(result.error ?? "")}`,
      );
    } else {
      logger.log(
        `  ${highlighter.error("\u2717")} ${result.client} ${highlighter.dim("\u2192")} ${result.error ?? "unknown error"}`,
      );
    }
  }

  return results;
};

const supportedAtScope = (scope: SkillScope): SkillClientDefinition[] =>
  getSkillClients().filter((client) => {
    if (!client.supported) return false;
    if (scope === "global" && !client.globalRoot) return false;
    if (scope === "project" && !client.projectRoot) return false;
    return true;
  });

export const buildAgentChoices = (
  scope: SkillScope,
  options: { allClients?: boolean } = {},
): AgentChoice[] => {
  const installedNames = new Set(detectInstalledSkillClients());
  const lastSelected = new Set(readKnownLastSelectedAgents());
  const candidates = options.allClients ? getSkillClients() : supportedAtScope(scope);

  return candidates.map((client) => {
    const isInstalled = installedNames.has(client.name);
    const detectedSuffix = isInstalled ? ` ${highlighter.dim("(detected)")}` : "";
    return {
      title: `${client.name}${detectedSuffix}`,
      value: client.name,
      selected: lastSelected.size > 0 ? lastSelected.has(client.name) : isInstalled,
    };
  });
};

export type SkillInstallOutcome = "cancelled" | "succeeded" | "failed";

export const promptSkillInstall = async (
  scope: SkillScope,
  cwd: string,
): Promise<SkillInstallOutcome> => {
  const choices = buildAgentChoices(scope);
  if (choices.length === 0) {
    logger.warn("No agents support skills at this scope.");
    return "cancelled";
  }

  // If exactly one supported agent is installed and the user has no prior
  // history, install to it directly without a prompt - skips a redundant
  // selection step for the common single-editor case.
  const installedNames = detectInstalledSkillClients();
  const lastSelected = readKnownLastSelectedAgents();
  if (installedNames.length === 1 && lastSelected.length === 0) {
    const onlyInstalled = installedNames[0];
    if (onlyInstalled) {
      logger.log(`Installing to ${highlighter.info(onlyInstalled)} (only detected agent).`);
      logger.break();
      const results = installSkills({ scope, cwd, selectedClients: [onlyInstalled] });
      const ok = results.some((result) => result.success);
      // Don't persist when the user didn't make an active choice. The
      // auto-route branch routes to the only detected agent without a
      // multiselect; persisting would silently restrict every future
      // interactive run to that single agent (see install-skill.ts which
      // skips persistence in its symmetrical auto-route branch for the
      // same reason).
      return ok ? "succeeded" : "failed";
    }
  }

  const { selectedAgents } = await prompts({
    type: "multiselect",
    name: "selectedAgents",
    message: `Select agents to install the React Grab skill for (${scope}):`,
    choices,
  });

  if (selectedAgents === undefined || selectedAgents.length === 0) {
    return "cancelled";
  }

  logger.break();
  const results = installSkills({ scope, cwd, selectedClients: selectedAgents });
  const ok = results.some((result) => result.success);
  if (ok) writeLastSelectedAgents(selectedAgents);
  return ok ? "succeeded" : "failed";
};

export const installDetectedOrAllSkills = (scope: SkillScope, cwd: string): InstallResult[] => {
  const detected = detectInstalledSkillClients();
  const targets = detected.length > 0 ? detected : supportedAtScope(scope).map((c) => c.name);
  return installSkills({ scope, cwd, selectedClients: targets });
};

export const removeSkills = (options: RemoveSkillsOptions): RemoveResult[] => {
  const { scope, cwd, selectedClients } = options;
  const supportedClients = getSkillClients().filter((client) => client.supported);
  const targetedClients = filterClientsByName(supportedClients, selectedClients);
  const targetedNameSet = new Set(targetedClients.map((client) => client.name));

  // Build a map from skillRoot -> all supported clients that share it. We
  // need this so we don't blow away the shared canonical .agents/skills file
  // when the user only asked to remove one of the agents using it.
  const rootToClients = new Map<string, SkillClientDefinition[]>();
  for (const client of supportedClients) {
    const root = resolveSkillRoot(client, scope, cwd);
    if (root === null) continue;
    const sharers = rootToClients.get(root) ?? [];
    sharers.push(client);
    rootToClients.set(root, sharers);
  }

  const removedRoots = new Set<string>();
  return targetedClients.map((client) => {
    const skillRoot = resolveSkillRoot(client, scope, cwd);
    if (skillRoot === null) {
      return { client: client.name, skillRoot: "", removed: false };
    }
    if (removedRoots.has(skillRoot)) {
      return { client: client.name, skillRoot, removed: false, deduped: true };
    }
    // If nothing is actually installed at this root, don't dress up the
    // result with a misleading "kept: still used by ..." note - the file
    // doesn't exist, so there's nothing to keep. Fall through to the plain
    // "Nothing to remove." branch in the caller.
    const fileExists = skillFileExists(skillRoot);
    const sharers = rootToClients.get(skillRoot) ?? [];
    const stillUsing = sharers
      .filter((sharer) => !targetedNameSet.has(sharer.name))
      .map((sharer) => sharer.name);
    if (fileExists && stillUsing.length > 0) {
      // Refuse to remove a file other (un-targeted) agents are still relying
      // on. The user can opt back in by also targeting those agents.
      return {
        client: client.name,
        skillRoot,
        removed: false,
        sharedWith: stillUsing,
      };
    }
    const removed = removeSkillFile(skillRoot);
    if (removed) removedRoots.add(skillRoot);
    return { client: client.name, skillRoot, removed };
  });
};
