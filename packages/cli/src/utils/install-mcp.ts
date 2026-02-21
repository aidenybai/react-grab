import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import * as jsonc from "jsonc-parser";
import * as TOML from "smol-toml";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";
import { spinner } from "./spinner.js";

const SERVER_NAME = "react-grab-mcp";
const PACKAGE_NAME = "@react-grab/mcp";

export interface ClientDefinition {
  name: string;
  configPath: string;
  configKey: string;
  format: "json" | "toml";
  serverConfig: Record<string, unknown>;
}

interface InstallResult {
  client: string;
  configPath: string;
  success: boolean;
  error?: string;
}

const getXdgConfigHome = (): string =>
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");

const getBaseDir = (): string => {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support");
  }
  return getXdgConfigHome();
};

const getZedConfigPath = (): string => {
  if (process.platform === "win32") {
    return path.join(getBaseDir(), "Zed", "settings.json");
  }
  return path.join(os.homedir(), ".config", "zed", "settings.json");
};

const getClients = (): ClientDefinition[] => {
  const homeDir = os.homedir();
  const baseDir = getBaseDir();

  const stdioConfig = {
    command: "npx",
    args: ["-y", PACKAGE_NAME, "--stdio"],
  };

  return [
    {
      name: "Claude Code",
      configPath: path.join(homeDir, ".claude.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
    {
      name: "Codex",
      configPath: path.join(
        process.env.CODEX_HOME || path.join(homeDir, ".codex"),
        "config.toml",
      ),
      configKey: "mcp_servers",
      format: "toml",
      serverConfig: stdioConfig,
    },
    {
      name: "Cursor",
      configPath: path.join(homeDir, ".cursor", "mcp.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
    {
      name: "OpenCode",
      configPath: path.join(getXdgConfigHome(), "opencode", "opencode.json"),
      configKey: "mcp",
      format: "json",
      serverConfig: {
        type: "local",
        command: ["npx", "-y", PACKAGE_NAME, "--stdio"],
      },
    },
    {
      name: "VS Code",
      configPath: path.join(baseDir, "Code", "User", "mcp.json"),
      configKey: "servers",
      format: "json",
      serverConfig: { type: "stdio", ...stdioConfig },
    },
    {
      name: "Amp",
      configPath: path.join(homeDir, ".config", "amp", "settings.json"),
      configKey: "amp.mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
    {
      name: "Droid",
      configPath: path.join(homeDir, ".factory", "mcp.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: { type: "stdio", ...stdioConfig },
    },
    {
      name: "Windsurf",
      configPath: path.join(homeDir, ".codeium", "windsurf", "mcp_config.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
    {
      name: "Zed",
      configPath: getZedConfigPath(),
      configKey: "context_servers",
      format: "json",
      serverConfig: { source: "custom", ...stdioConfig, env: {} },
    },
  ];
};

const ensureDirectory = (filePath: string): void => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const JSONC_FORMAT_OPTIONS: jsonc.FormattingOptions = {
  tabSize: 2,
  insertSpaces: true,
};

export const upsertIntoJsonc = (
  filePath: string,
  content: string,
  configKey: string,
  serverName: string,
  serverConfig: Record<string, unknown>,
): void => {
  const edits = jsonc.modify(content, [configKey, serverName], serverConfig, {
    formattingOptions: JSONC_FORMAT_OPTIONS,
  });
  fs.writeFileSync(filePath, jsonc.applyEdits(content, edits));
};

export const installJsonClient = (client: ClientDefinition): void => {
  ensureDirectory(client.configPath);

  const content = fs.existsSync(client.configPath)
    ? fs.readFileSync(client.configPath, "utf8")
    : "{}";

  upsertIntoJsonc(
    client.configPath,
    content,
    client.configKey,
    SERVER_NAME,
    client.serverConfig,
  );
};

export const installTomlClient = (client: ClientDefinition): void => {
  ensureDirectory(client.configPath);

  const existingConfig: Record<string, unknown> = fs.existsSync(
    client.configPath,
  )
    ? TOML.parse(fs.readFileSync(client.configPath, "utf8"))
    : {};

  const serverSection = (existingConfig[client.configKey] ?? {}) as Record<
    string,
    unknown
  >;
  serverSection[SERVER_NAME] = client.serverConfig;
  existingConfig[client.configKey] = serverSection;

  fs.writeFileSync(client.configPath, TOML.stringify(existingConfig));
};

export const getMcpClientNames = (): string[] =>
  getClients().map((client) => client.name);

export const installMcpServers = (
  selectedClients?: string[],
): InstallResult[] => {
  const allClients = getClients();
  const clients = selectedClients
    ? allClients.filter((client) => selectedClients.includes(client.name))
    : allClients;
  const results: InstallResult[] = [];

  const installSpinner = spinner("Installing MCP server.").start();

  for (const client of clients) {
    try {
      if (client.format === "toml") {
        installTomlClient(client);
      } else {
        installJsonClient(client);
      }
      results.push({
        client: client.name,
        configPath: client.configPath,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        client: client.name,
        configPath: client.configPath,
        success: false,
        error: message,
      });
    }
  }

  const successCount = results.filter((result) => result.success).length;

  if (successCount < results.length) {
    installSpinner.warn(
      `Installed to ${successCount}/${results.length} agents.`,
    );
  } else {
    installSpinner.succeed(`Installed to ${successCount} agents.`);
  }

  for (const result of results) {
    if (result.success) {
      logger.log(
        `  ${highlighter.success("\u2713")} ${result.client} ${highlighter.dim("\u2192")} ${highlighter.dim(result.configPath)}`,
      );
    } else {
      logger.log(
        `  ${highlighter.error("\u2717")} ${result.client} ${highlighter.dim("\u2192")} ${result.error}`,
      );
    }
  }

  return results;
};

export const promptConnectionMode = async (): Promise<
  "mcp" | "legacy" | undefined
> => {
  const { connectionMode } = await prompts({
    type: "select",
    name: "connectionMode",
    message: "How would you like to connect?",
    choices: [
      {
        title: `MCP ${highlighter.dim("(recommended)")}`,
        description: "Installs to all supported agents at once",
        value: "mcp",
      },
      {
        title: "Legacy",
        description: "Install a per-project agent package",
        value: "legacy",
      },
    ],
  });

  return connectionMode as "mcp" | "legacy" | undefined;
};

export const promptMcpInstall = async (): Promise<boolean> => {
  const clientNames = getMcpClientNames();
  const { selectedAgents } = await prompts({
    type: "multiselect",
    name: "selectedAgents",
    message: "Select agents to install MCP server for:",
    choices: clientNames.map((name) => ({
      title: name,
      value: name,
      selected: true,
    })),
  });

  if (selectedAgents === undefined || selectedAgents.length === 0) {
    return false;
  }

  logger.break();
  const results = installMcpServers(selectedAgents);
  const hasSuccess = results.some((result) => result.success);
  return hasSuccess;
};
