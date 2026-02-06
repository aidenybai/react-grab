import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
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

const getBaseDir = (): string => {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support");
  }
  return process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config");
};

const getZedConfigPath = (): string => {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    return path.join(appData, "Zed", "settings.json");
  }
  return path.join(homeDir, ".config", "zed", "settings.json");
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
      name: "Cursor",
      configPath: path.join(homeDir, ".cursor", "mcp.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
    {
      name: "VS Code",
      configPath: path.join(baseDir, "Code", "User", "mcp.json"),
      configKey: "servers",
      format: "json",
      serverConfig: { type: "stdio", ...stdioConfig },
    },
    {
      name: "Claude Code",
      configPath: path.join(homeDir, ".claude.json"),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
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
      name: "Zed",
      configPath: getZedConfigPath(),
      configKey: "context_servers",
      format: "json",
      serverConfig: { source: "custom", ...stdioConfig, env: {} },
    },
    {
      name: "Windsurf",
      configPath: path.join(
        homeDir,
        ".codeium",
        "windsurf",
        "mcp_config.json",
      ),
      configKey: "mcpServers",
      format: "json",
      serverConfig: stdioConfig,
    },
  ];
};

export const ensureDirectory = (filePath: string): void => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

export const indentJson = (json: string, baseIndent: string): string =>
  json
    .split("\n")
    .map((line, index) => (index === 0 ? line : baseIndent + line))
    .join("\n");

export const insertIntoJsonc = (
  filePath: string,
  content: string,
  configKey: string,
  serverName: string,
  serverConfig: Record<string, unknown>,
): void => {
  if (content.includes(`"${serverName}"`)) return;

  const serverJson = indentJson(
    JSON.stringify(serverConfig, null, 2),
    "      ",
  );
  const keyPattern = new RegExp(`"${configKey}"\\s*:\\s*\\{`);
  const keyMatch = keyPattern.exec(content);

  if (keyMatch) {
    const insertPosition = keyMatch.index + keyMatch[0].length;
    const entry = `\n    "${serverName}": ${serverJson},`;
    fs.writeFileSync(
      filePath,
      content.slice(0, insertPosition) +
        entry +
        content.slice(insertPosition),
    );
    return;
  }

  const lastBrace = content.lastIndexOf("}");
  if (lastBrace === -1) return;

  const beforeBrace = content.slice(0, lastBrace).trimEnd();
  const withoutComments = beforeBrace.replace(/\/\/.*$/, "").trimEnd();
  const lastChar = withoutComments[withoutComments.length - 1];
  const needsComma =
    lastChar !== undefined && lastChar !== "{" && lastChar !== ",";

  const section = `${needsComma ? "," : ""}\n  "${configKey}": {\n    "${serverName}": ${serverJson}\n  }`;
  fs.writeFileSync(filePath, beforeBrace + section + "\n}\n");
};

export const installJsonClient = (client: ClientDefinition): void => {
  ensureDirectory(client.configPath);

  if (!fs.existsSync(client.configPath)) {
    const config = {
      [client.configKey]: { [SERVER_NAME]: client.serverConfig },
    };
    fs.writeFileSync(
      client.configPath,
      JSON.stringify(config, null, 2) + "\n",
    );
    return;
  }

  const content = fs.readFileSync(client.configPath, "utf8");

  try {
    const config = JSON.parse(content) as Record<string, unknown>;
    const servers =
      (config[client.configKey] as Record<string, unknown>) ?? {};
    servers[SERVER_NAME] = client.serverConfig;
    config[client.configKey] = servers;
    fs.writeFileSync(
      client.configPath,
      JSON.stringify(config, null, 2) + "\n",
    );
  } catch {
    insertIntoJsonc(
      client.configPath,
      content,
      client.configKey,
      SERVER_NAME,
      client.serverConfig,
    );
  }
};

export const buildTomlSection = (
  configKey: string,
  serverConfig: Record<string, unknown>,
): string => {
  const lines = [`[${configKey}.${SERVER_NAME}]`];
  for (const [key, value] of Object.entries(serverConfig)) {
    if (typeof value === "string") {
      lines.push(`${key} = "${value}"`);
    } else if (Array.isArray(value)) {
      const items = value.map((item) => `"${item}"`).join(", ");
      lines.push(`${key} = [${items}]`);
    }
  }
  return lines.join("\n");
};

export const installTomlClient = (client: ClientDefinition): void => {
  ensureDirectory(client.configPath);

  const sectionHeader = `[${client.configKey}.${SERVER_NAME}]`;
  const newSection = buildTomlSection(
    client.configKey,
    client.serverConfig,
  );

  if (!fs.existsSync(client.configPath)) {
    fs.writeFileSync(client.configPath, newSection + "\n");
    return;
  }

  const content = fs.readFileSync(client.configPath, "utf8");

  if (!content.includes(sectionHeader)) {
    fs.writeFileSync(
      client.configPath,
      content.trimEnd() + "\n\n" + newSection + "\n",
    );
    return;
  }

  const lines = content.split("\n");
  const resultLines: string[] = [];
  let isInsideOurSection = false;
  let didInsertReplacement = false;

  for (const line of lines) {
    if (line.trim() === sectionHeader) {
      isInsideOurSection = true;
      if (!didInsertReplacement) {
        resultLines.push(newSection);
        didInsertReplacement = true;
      }
      continue;
    }

    if (isInsideOurSection && line.startsWith("[")) {
      isInsideOurSection = false;
    }

    if (!isInsideOurSection) {
      resultLines.push(line);
    }
  }

  fs.writeFileSync(client.configPath, resultLines.join("\n"));
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
      const message =
        error instanceof Error ? error.message : String(error);
      results.push({
        client: client.name,
        configPath: client.configPath,
        success: false,
        error: message,
      });
    }
  }

  const successCount = results.filter((result) => result.success).length;
  const failedCount = results.length - successCount;

  if (failedCount > 0) {
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
  installMcpServers(selectedAgents);
  return true;
};
