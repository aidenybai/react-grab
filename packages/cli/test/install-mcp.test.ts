import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildTomlSection,
  type ClientDefinition,
  indentJson,
  insertIntoJsonc,
  installJsonClient,
  installTomlClient,
  getMcpClientNames,
} from "../src/utils/install-mcp.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "install-mcp-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const makeJsonClient = (
  overrides: Partial<ClientDefinition> = {},
): ClientDefinition => ({
  name: "TestClient",
  configPath: path.join(tempDir, "config.json"),
  configKey: "mcpServers",
  format: "json",
  serverConfig: { command: "npx", args: ["-y", "@react-grab/mcp", "--stdio"] },
  ...overrides,
});

const makeTomlClient = (
  overrides: Partial<ClientDefinition> = {},
): ClientDefinition => ({
  name: "TestToml",
  configPath: path.join(tempDir, "config.toml"),
  configKey: "mcp_servers",
  format: "toml",
  serverConfig: { command: "npx", args: ["-y", "@react-grab/mcp", "--stdio"] },
  ...overrides,
});

describe("getMcpClientNames", () => {
  it("should return all 8 client names", () => {
    const names = getMcpClientNames();

    expect(names).toHaveLength(8);
    expect(names).toContain("Cursor");
    expect(names).toContain("VS Code");
    expect(names).toContain("Claude Code");
    expect(names).toContain("Amp");
    expect(names).toContain("Droid");
    expect(names).toContain("Codex");
    expect(names).toContain("Zed");
    expect(names).toContain("Windsurf");
  });
});

describe("indentJson", () => {
  it("should not indent the first line", () => {
    const result = indentJson('{\n  "key": "value"\n}', "    ");

    expect(result).toBe('{\n      "key": "value"\n    }');
  });

  it("should handle single-line json", () => {
    const result = indentJson('"value"', "  ");

    expect(result).toBe('"value"');
  });
});

describe("buildTomlSection", () => {
  it("should build a valid TOML section with string and array values", () => {
    const result = buildTomlSection("mcp_servers", {
      command: "npx",
      args: ["-y", "@react-grab/mcp", "--stdio"],
    });

    expect(result).toBe(
      '[mcp_servers.react-grab-mcp]\ncommand = "npx"\nargs = ["-y", "@react-grab/mcp", "--stdio"]',
    );
  });

  it("should skip non-string non-array values", () => {
    const result = buildTomlSection("mcp_servers", {
      command: "npx",
      enabled: true,
    });

    expect(result).toBe('[mcp_servers.react-grab-mcp]\ncommand = "npx"');
  });
});

describe("installJsonClient", () => {
  it("should create a new config file when none exists", () => {
    const client = makeJsonClient();

    installJsonClient(client);

    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content.mcpServers["react-grab-mcp"]).toEqual(client.serverConfig);
  });

  it("should merge into an existing config file", () => {
    const client = makeJsonClient();
    fs.writeFileSync(
      client.configPath,
      JSON.stringify({
        mcpServers: { "other-server": { command: "other" } },
      }),
    );

    installJsonClient(client);

    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content.mcpServers["other-server"]).toEqual({ command: "other" });
    expect(content.mcpServers["react-grab-mcp"]).toEqual(client.serverConfig);
  });

  it("should overwrite existing react-grab-mcp entry", () => {
    const client = makeJsonClient();
    fs.writeFileSync(
      client.configPath,
      JSON.stringify({
        mcpServers: { "react-grab-mcp": { command: "old" } },
      }),
    );

    installJsonClient(client);

    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content.mcpServers["react-grab-mcp"]).toEqual(client.serverConfig);
  });

  it("should create the configKey when it does not exist", () => {
    const client = makeJsonClient();
    fs.writeFileSync(
      client.configPath,
      JSON.stringify({ someOtherKey: "value" }),
    );

    installJsonClient(client);

    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content.someOtherKey).toBe("value");
    expect(content.mcpServers["react-grab-mcp"]).toEqual(client.serverConfig);
  });

  it("should create nested directories if needed", () => {
    const client = makeJsonClient({
      configPath: path.join(tempDir, "deep", "nested", "config.json"),
    });

    installJsonClient(client);

    expect(fs.existsSync(client.configPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content.mcpServers["react-grab-mcp"]).toEqual(client.serverConfig);
  });

  it("should handle a dot-separated configKey like amp.mcpServers", () => {
    const client = makeJsonClient({ configKey: "amp.mcpServers" });

    installJsonClient(client);

    const content = JSON.parse(fs.readFileSync(client.configPath, "utf8"));
    expect(content["amp.mcpServers"]["react-grab-mcp"]).toEqual(
      client.serverConfig,
    );
  });
});

describe("insertIntoJsonc", () => {
  it("should insert into existing configKey section", () => {
    const filePath = path.join(tempDir, "settings.json");
    const content = `// comment\n{\n  "context_servers": {\n    "existing": {}\n  }\n}`;
    fs.writeFileSync(filePath, content);

    insertIntoJsonc(filePath, content, "context_servers", "react-grab-mcp", {
      command: "npx",
    });

    const result = fs.readFileSync(filePath, "utf8");
    expect(result).toContain('"react-grab-mcp"');
    expect(result).toContain("// comment");
    expect(result).toContain('"existing"');
  });

  it("should add a new configKey section when none exists", () => {
    const filePath = path.join(tempDir, "settings.json");
    const content = `// comment\n{\n  "theme": "dark"\n}`;
    fs.writeFileSync(filePath, content);

    insertIntoJsonc(filePath, content, "context_servers", "react-grab-mcp", {
      command: "npx",
    });

    const result = fs.readFileSync(filePath, "utf8");
    expect(result).toContain('"context_servers"');
    expect(result).toContain('"react-grab-mcp"');
    expect(result).toContain("// comment");
    expect(result).toContain('"theme"');
  });

  it("should skip if server name already exists", () => {
    const filePath = path.join(tempDir, "settings.json");
    const content = `{\n  "servers": {\n    "react-grab-mcp": { "old": true }\n  }\n}`;
    fs.writeFileSync(filePath, content);

    insertIntoJsonc(filePath, content, "servers", "react-grab-mcp", {
      command: "new",
    });

    const result = fs.readFileSync(filePath, "utf8");
    expect(result).toContain('"old": true');
    expect(result).not.toContain('"new"');
  });
});

describe("installTomlClient", () => {
  it("should create a new TOML file when none exists", () => {
    const client = makeTomlClient();

    installTomlClient(client);

    const content = fs.readFileSync(client.configPath, "utf8");
    expect(content).toContain("[mcp_servers.react-grab-mcp]");
    expect(content).toContain('command = "npx"');
    expect(content).toContain('args = ["-y", "@react-grab/mcp", "--stdio"]');
  });

  it("should append to an existing TOML file", () => {
    const client = makeTomlClient();
    fs.writeFileSync(
      client.configPath,
      '[mcp_servers.other]\ncommand = "other"\n',
    );

    installTomlClient(client);

    const content = fs.readFileSync(client.configPath, "utf8");
    expect(content).toContain("[mcp_servers.other]");
    expect(content).toContain("[mcp_servers.react-grab-mcp]");
  });

  it("should replace an existing react-grab-mcp section", () => {
    const client = makeTomlClient();
    fs.writeFileSync(
      client.configPath,
      '[mcp_servers.react-grab-mcp]\ncommand = "old"\n\n[other]\nkey = "val"\n',
    );

    installTomlClient(client);

    const content = fs.readFileSync(client.configPath, "utf8");
    expect(content).toContain('command = "npx"');
    expect(content).not.toContain('command = "old"');
    expect(content).toContain("[other]");
  });

  it("should create nested directories if needed", () => {
    const client = makeTomlClient({
      configPath: path.join(tempDir, "deep", "config.toml"),
    });

    installTomlClient(client);

    expect(fs.existsSync(client.configPath)).toBe(true);
  });
});
