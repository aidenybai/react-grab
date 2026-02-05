import { Command } from "commander";
import pc from "picocolors";
import { prompts } from "../utils/prompts.js";
import { detectProject } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  applyOptionsTransform,
  applyTransform,
  previewCdnTransform,
  previewOptionsTransform,
  type ReactGrabOptions,
} from "../utils/transform.js";
import {
  MAX_SUGGESTIONS_COUNT,
  MAX_KEY_HOLD_DURATION_MS,
  MAX_CONTEXT_LINES,
} from "../utils/constants.js";

const VERSION = process.env.VERSION ?? "0.0.1";

interface ConfigOption {
  id: string;
  title: string;
  description: string;
}

const isMac = process.platform === "darwin";
const META_LABEL = isMac ? "Cmd" : "Win";
const ALT_LABEL = isMac ? "Option" : "Alt";

const MODIFIER_ALIASES: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  win: "meta",
  windows: "meta",
  meta: "meta",
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  alt: "alt",
  option: "alt",
  opt: "alt",
};

const MODIFIERS = ["meta", "ctrl", "shift", "alt"] as const;

const BASE_KEYS: Array<{ key: string; aliases: string[] }> = [
  { key: " ", aliases: ["space", "spacebar"] },
  { key: "Enter", aliases: ["enter", "return"] },
  { key: "Escape", aliases: ["escape", "esc"] },
  { key: "Tab", aliases: ["tab"] },
  { key: "Backspace", aliases: ["backspace", "back"] },
  { key: "Delete", aliases: ["delete", "del"] },
  { key: "Insert", aliases: ["insert", "ins"] },
  { key: "Home", aliases: ["home"] },
  { key: "End", aliases: ["end"] },
  { key: "PageUp", aliases: ["pageup", "pgup"] },
  { key: "PageDown", aliases: ["pagedown", "pgdn", "pgdown"] },
  { key: "ArrowUp", aliases: ["arrowup", "up"] },
  { key: "ArrowDown", aliases: ["arrowdown", "down"] },
  { key: "ArrowLeft", aliases: ["arrowleft", "left"] },
  { key: "ArrowRight", aliases: ["arrowright", "right"] },
  ...Array.from({ length: 12 }, (_, i) => ({
    key: `F${i + 1}`,
    aliases: [`f${i + 1}`],
  })),
  ...Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(97 + i);
    return { key: letter, aliases: [letter] };
  }),
  ...Array.from({ length: 10 }, (_, i) => ({
    key: String(i),
    aliases: [String(i)],
  })),
  { key: "`", aliases: ["backtick", "grave", "`"] },
  { key: "-", aliases: ["minus", "dash", "-"] },
  { key: "=", aliases: ["equals", "equal", "="] },
  { key: "[", aliases: ["leftbracket", "lbracket", "["] },
  { key: "]", aliases: ["rightbracket", "rbracket", "]"] },
  { key: "\\", aliases: ["backslash", "\\"] },
  { key: ";", aliases: ["semicolon", ";"] },
  { key: "'", aliases: ["quote", "apostrophe", "'"] },
  { key: ",", aliases: ["comma", ","] },
  { key: ".", aliases: ["period", "dot", "."] },
  { key: "/", aliases: ["slash", "forwardslash", "/"] },
];

interface KeyCombo {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

interface KeyChoice {
  title: string;
  value: KeyCombo;
}

const formatCombo = (combo: KeyCombo): string => {
  const parts: string[] = [];
  if (combo.metaKey) parts.push(META_LABEL);
  if (combo.ctrlKey) parts.push("Ctrl");
  if (combo.shiftKey) parts.push("Shift");
  if (combo.altKey) parts.push(ALT_LABEL);
  const keyDisplay =
    combo.key === " "
      ? "Space"
      : combo.key.length === 1
        ? combo.key.toUpperCase()
        : combo.key;
  parts.push(keyDisplay);
  return parts.join("+");
};

const parseInput = (
  input: string,
): { modifiers: Set<string>; partial: string } => {
  const normalized = input.toLowerCase().replace(/\s+/g, "");
  const parts = normalized.split(/[+\-]/);
  const modifiers = new Set<string>();
  let partial = "";

  for (const part of parts) {
    if (!part) continue;
    const modifierKey = MODIFIER_ALIASES[part];
    if (modifierKey) {
      modifiers.add(modifierKey);
    } else {
      partial = part;
    }
  }

  return { modifiers, partial };
};

const POPULAR_KEYS = ["g", "k", "e", "d", "b", " ", "Escape", "Enter"];

const generateSuggestions = (input: string): KeyChoice[] => {
  const { modifiers, partial } = parseInput(input);
  const suggestions: KeyChoice[] = [];

  if (!partial && modifiers.size === 0 && !input) {
    for (const mod of MODIFIERS) {
      const label =
        mod === "meta"
          ? META_LABEL
          : mod === "alt"
            ? ALT_LABEL
            : mod.charAt(0).toUpperCase() + mod.slice(1);
      for (const popularKey of POPULAR_KEYS) {
        const keyDisplay =
          popularKey === " "
            ? "Space"
            : popularKey.length === 1
              ? popularKey.toUpperCase()
              : popularKey;
        suggestions.push({
          title: `${label}+${keyDisplay}`,
          value: {
            key: popularKey,
            ...(mod === "meta" ? { metaKey: true } : {}),
            ...(mod === "ctrl" ? { ctrlKey: true } : {}),
            ...(mod === "shift" ? { shiftKey: true } : {}),
            ...(mod === "alt" ? { altKey: true } : {}),
          },
        });
      }
    }
    for (const baseKey of BASE_KEYS) {
      suggestions.push({
        title:
          baseKey.key === " "
            ? "Space"
            : baseKey.key.length === 1
              ? baseKey.key.toUpperCase()
              : baseKey.key,
        value: { key: baseKey.key },
      });
    }
    return suggestions;
  }

  const buildCombo = (
    key: string,
    mods: Set<string>,
    extraMod?: string,
  ): KeyCombo => ({
    key,
    ...(mods.has("meta") || extraMod === "meta" ? { metaKey: true } : {}),
    ...(mods.has("ctrl") || extraMod === "ctrl" ? { ctrlKey: true } : {}),
    ...(mods.has("shift") || extraMod === "shift" ? { shiftKey: true } : {}),
    ...(mods.has("alt") || extraMod === "alt" ? { altKey: true } : {}),
  });

  for (const baseKey of BASE_KEYS) {
    const matches = partial
      ? baseKey.aliases.some((alias) => alias.startsWith(partial))
      : true;
    if (matches) {
      const combo = buildCombo(baseKey.key, modifiers);
      suggestions.push({
        title: formatCombo(combo),
        value: combo,
      });
    }
  }

  if (!partial) {
    const unusedMods = MODIFIERS.filter((m) => !modifiers.has(m));
    for (const mod of unusedMods) {
      for (const popularKey of POPULAR_KEYS) {
        const combo = buildCombo(popularKey, modifiers, mod);
        suggestions.push({
          title: formatCombo(combo),
          value: combo,
        });
      }
    }
  }

  return suggestions.slice(0, MAX_SUGGESTIONS_COUNT);
};

const CONFIG_OPTIONS: ConfigOption[] = [
  {
    id: "activationKey",
    title: "Activation Key",
    description: "The key used to activate React Grab (e.g., g, k, space)",
  },
  {
    id: "activationMode",
    title: "Activation Mode",
    description: "Toggle (press to activate/deactivate) or Hold (hold key)",
  },
  {
    id: "keyHoldDuration",
    title: "Key Hold Duration",
    description: "Milliseconds to hold the key before activation (hold mode)",
  },
  {
    id: "allowActivationInsideInput",
    title: "Allow Activation Inside Input",
    description: "Whether to allow activation when focused on input fields",
  },
  {
    id: "maxContextLines",
    title: "Max Context Lines",
    description: "Number of surrounding code lines to include in context",
  },
];

const formatActivationKeyDisplay = (
  activationKey: ReactGrabOptions["activationKey"],
): string => {
  if (!activationKey) return "Default (Option/Alt)";
  return activationKey
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "meta") return process.platform === "darwin" ? "⌘" : "Win";
      if (lower === "alt") return process.platform === "darwin" ? "⌥" : "Alt";
      if (lower === "ctrl") return "Ctrl";
      if (lower === "shift") return "Shift";
      if (lower === "space" || lower === " ") return "Space";
      return part.toUpperCase();
    })
    .join(" + ");
};

const comboToString = (combo: KeyCombo): string => {
  const parts: string[] = [];
  if (combo.metaKey) parts.push("Meta");
  if (combo.ctrlKey) parts.push("Ctrl");
  if (combo.shiftKey) parts.push("Shift");
  if (combo.altKey) parts.push("Alt");
  if (combo.key) {
    const keyDisplay = combo.key === " " ? "Space" : combo.key;
    parts.push(keyDisplay);
  }
  return parts.join("+");
};

export const configure = new Command()
  .name("configure")
  .alias("config")
  .description("configure React Grab options")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option(
    "-k, --key <key>",
    "activation key (e.g., Meta+K, Ctrl+Shift+G, Space)",
  )
  .option("-m, --mode <mode>", "activation mode (toggle, hold)")
  .option(
    "--hold-duration <ms>",
    "key hold duration in milliseconds (for hold mode)",
  )
  .option(
    "--allow-input <boolean>",
    "allow activation inside input fields (true/false)",
  )
  .option("--context-lines <lines>", "max context lines to include")
  .option(
    "--cdn <domain>",
    "CDN domain (e.g., unpkg.com, custom.react-grab.com)",
  )
  .option(
    "-c, --cwd <cwd>",
    "working directory (defaults to current directory)",
    process.cwd(),
  )
  .action(async (opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    try {
      const cwd = opts.cwd;

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

      if (!projectInfo.hasReactGrab) {
        preflightSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(
          `Run ${highlighter.info("react-grab init")} first to install React Grab.`,
        );
        logger.break();
        process.exit(1);
      }

      preflightSpinner.succeed();

      if (opts.cdn) {
        const result = previewCdnTransform(
          projectInfo.projectRoot,
          projectInfo.framework,
          projectInfo.nextRouterType,
          opts.cdn,
        );

        if (!result.success) {
          logger.break();
          logger.error(result.message);
          logger.break();
          process.exit(1);
        }

        if (result.noChanges) {
          logger.break();
          logger.log("No changes needed.");
          logger.break();
          process.exit(0);
        }

        logger.break();
        printDiff(result.filePath, result.originalContent!, result.newContent!);

        if (!opts.yes) {
          logger.break();
          const { proceed } = await prompts({
            type: "confirm",
            name: "proceed",
            message: "Apply these changes?",
            initial: true,
          });

          if (!proceed) {
            logger.break();
            logger.log("Changes cancelled.");
            logger.break();
            process.exit(0);
          }
        }

        const writeSpinner = spinner(
          `Applying changes to ${result.filePath}.`,
        ).start();
        const writeResult = applyTransform(result);
        if (!writeResult.success) {
          writeSpinner.fail();
          logger.break();
          logger.error(writeResult.error || "Failed to write file.");
          logger.break();
          process.exit(1);
        }
        writeSpinner.succeed();

        logger.break();
        logger.log(`${highlighter.success("Success!")} CDN updated.`);
        logger.break();
        return;
      }

      const hasFlags =
        opts.key ||
        opts.mode ||
        opts.holdDuration ||
        opts.allowInput ||
        opts.contextLines;

      logger.break();
      logger.log(`Configure ${highlighter.info("React Grab")} options:`);
      logger.break();

      const collectedOptions: ReactGrabOptions = {};

      if (hasFlags) {
        if (opts.key) {
          collectedOptions.activationKey = opts.key;
          logger.log(
            `  Activation key: ${highlighter.info(formatActivationKeyDisplay(collectedOptions.activationKey))}`,
          );
        }

        if (opts.mode) {
          if (opts.mode !== "toggle" && opts.mode !== "hold") {
            logger.error(`Invalid mode: ${opts.mode}. Use "toggle" or "hold".`);
            logger.break();
            process.exit(1);
          }
          collectedOptions.activationMode = opts.mode;
          logger.log(`  Activation mode: ${highlighter.info(opts.mode)}`);
        }

        if (opts.holdDuration) {
          const duration = parseInt(opts.holdDuration, 10);
          if (
            isNaN(duration) ||
            duration < 0 ||
            duration > MAX_KEY_HOLD_DURATION_MS
          ) {
            logger.error(
              `Invalid hold duration. Must be 0-${MAX_KEY_HOLD_DURATION_MS}ms.`,
            );
            logger.break();
            process.exit(1);
          }
          collectedOptions.keyHoldDuration = duration;
          logger.log(
            `  Key hold duration: ${highlighter.info(`${duration}ms`)}`,
          );
        }

        if (opts.allowInput !== undefined) {
          const allowInput =
            opts.allowInput === "true" || opts.allowInput === true;
          collectedOptions.allowActivationInsideInput = allowInput;
          logger.log(
            `  Allow activation inside input: ${highlighter.info(String(allowInput))}`,
          );
        }

        if (opts.contextLines) {
          const lines = parseInt(opts.contextLines, 10);
          if (isNaN(lines) || lines < 0 || lines > MAX_CONTEXT_LINES) {
            logger.error(
              `Invalid context lines. Must be 0-${MAX_CONTEXT_LINES}.`,
            );
            logger.break();
            process.exit(1);
          }
          collectedOptions.maxContextLines = lines;
          logger.log(`  Max context lines: ${highlighter.info(String(lines))}`);
        }
      } else {
        const { selectedOption } = await prompts({
          type: "autocomplete",
          name: "selectedOption",
          message: "Search for an option to configure:",
          choices: CONFIG_OPTIONS.map((option) => ({
            title: option.title,
            value: option.id,
            description: option.description,
          })),
          suggest: (input, choices) =>
            Promise.resolve(
              choices.filter(
                (choice) =>
                  choice.title.toLowerCase().includes(input.toLowerCase()) ||
                  (choice.description
                    ?.toLowerCase()
                    .includes(input.toLowerCase()) ??
                    false),
              ),
            ),
        });

        if (selectedOption === undefined) {
          logger.break();
          process.exit(1);
        }

        if (selectedOption === "activationKey") {
          const { selectedCombo } = await prompts({
            type: "autocomplete",
            name: "selectedCombo",
            message: "Type key combination (e.g. ctrl+shift+g):",
            choices: generateSuggestions(""),
            suggest: (input) => Promise.resolve(generateSuggestions(input)),
          });

          if (selectedCombo === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.activationKey = comboToString(selectedCombo);

          logger.log(
            `  Activation key: ${highlighter.info(formatActivationKeyDisplay(collectedOptions.activationKey))}`,
          );
        }

        if (selectedOption === "activationMode") {
          const { activationMode } = await prompts({
            type: "select",
            name: "activationMode",
            message: `Select ${highlighter.info("activation mode")}:`,
            choices: [
              {
                title: "Toggle (press to activate/deactivate)",
                value: "toggle",
              },
              { title: "Hold (hold key to keep active)", value: "hold" },
            ],
            initial: 0,
          });

          if (activationMode === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.activationMode = activationMode;
        }

        if (selectedOption === "keyHoldDuration") {
          const { keyHoldDuration } = await prompts({
            type: "number",
            name: "keyHoldDuration",
            message: `Enter ${highlighter.info("key hold duration")} in milliseconds:`,
            initial: 150,
            min: 0,
            max: 2000,
          });

          if (keyHoldDuration === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.keyHoldDuration = keyHoldDuration;
        }

        if (selectedOption === "allowActivationInsideInput") {
          const { allowActivationInsideInput } = await prompts({
            type: "confirm",
            name: "allowActivationInsideInput",
            message: `Allow activation ${highlighter.info("inside input fields")}?`,
            initial: true,
          });

          if (allowActivationInsideInput === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.allowActivationInsideInput =
            allowActivationInsideInput;
        }

        if (selectedOption === "maxContextLines") {
          const { maxContextLines } = await prompts({
            type: "number",
            name: "maxContextLines",
            message: `Enter ${highlighter.info("max context lines")} to include:`,
            initial: 3,
            min: 0,
            max: 50,
          });

          if (maxContextLines === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.maxContextLines = maxContextLines;
        }
      }

      const result = previewOptionsTransform(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
        collectedOptions,
      );

      if (!result.success) {
        logger.break();
        logger.warn(result.message);
        logger.break();

        const configJson = JSON.stringify(collectedOptions);
        logger.log(
          `Add this to your ${highlighter.info("init()")} call or ${highlighter.info("data-options")} attribute:`,
        );
        logger.break();
        console.log(`  ${pc.cyan(configJson)}`);
        logger.break();
        process.exit(1);
      }

      const hasChanges =
        !result.noChanges && result.originalContent && result.newContent;

      if (hasChanges) {
        logger.break();
        printDiff(result.filePath, result.originalContent!, result.newContent!);

        if (!opts.yes) {
          logger.break();
          const { proceed } = await prompts({
            type: "confirm",
            name: "proceed",
            message: "Apply these changes?",
            initial: true,
          });

          if (!proceed) {
            logger.break();
            logger.log("Changes cancelled.");
            logger.break();
            process.exit(0);
          }
        }

        const writeSpinner = spinner(
          `Applying changes to ${result.filePath}.`,
        ).start();
        const writeResult = applyOptionsTransform(result);
        if (!writeResult.success) {
          writeSpinner.fail();
          logger.break();
          logger.error(writeResult.error || "Failed to write file.");
          logger.break();
          process.exit(1);
        }
        writeSpinner.succeed();
      } else {
        logger.break();
        logger.log("No changes needed.");
      }

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} React Grab options have been configured.`,
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
