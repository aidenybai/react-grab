import fs from "node:fs";
import path from "node:path";
import Clipboard from "@crosscopy/clipboard";

const HOOK_COMMAND = "npx @react-grab/agent-hooks run";

interface SessionStartOutput {
  continue: boolean;
  additional_context?: string;
}

interface ReactGrabMetadata {
  version: string;
  content: string;
  timestamp: number;
  prompt?: string;
}

const parseReactGrabMetadata = (html: string): ReactGrabMetadata | null => {
  const match = html.match(/data-react-grab="([^"]+)"/);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    return JSON.parse(decoded) as ReactGrabMetadata;
  } catch {
    return null;
  }
};

const consumeStdin = async (): Promise<void> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
};

const runSessionHook = async (): Promise<void> => {
  await consumeStdin();

  let html = "";
  try {
    html = await Clipboard.getHtml();
  } catch (error) {
    console.error("[react-grab hook] failed to read clipboard:", error);
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const metadata = parseReactGrabMetadata(html);
  const output: SessionStartOutput = { continue: true };

  if (metadata) {
    console.error("[react-grab hook] detected react-grab content (v" + metadata.version + ")");
    output.additional_context = `## Grabbed React Content

The user has copied React component context from React Grab. Use this to understand what UI element they're referring to:

\`\`\`
${metadata.content.trim()}
\`\`\``;
  } else {
    console.error("[react-grab hook] no react-grab content detected");
  }

  process.stdout.write(JSON.stringify(output) + "\n");
};

interface CursorHooksConfig {
  version: number;
  hooks: {
    sessionStart: Array<{ command: string }>;
  };
}

interface ClaudeCodeHooksConfig {
  hooks: {
    SessionStart: Array<{
      hooks: Array<{ type: "command"; command: string }>;
    }>;
  };
}

interface CopilotHooksConfig {
  sessionStart: Array<{
    type: "command";
    bash: string;
    powershell: string;
    cwd: string;
    timeoutSec: number;
  }>;
}

type AgentTool = "cursor" | "claude-code" | "copilot";

const generateCursorConfig = (): CursorHooksConfig => ({
  version: 1,
  hooks: {
    sessionStart: [{ command: HOOK_COMMAND }],
  },
});

const generateClaudeCodeConfig = (): ClaudeCodeHooksConfig => ({
  hooks: {
    SessionStart: [
      {
        hooks: [{ type: "command", command: HOOK_COMMAND }],
      },
    ],
  },
});

const generateCopilotConfig = (): CopilotHooksConfig => ({
  sessionStart: [
    {
      type: "command",
      bash: HOOK_COMMAND,
      powershell: HOOK_COMMAND,
      cwd: ".",
      timeoutSec: 30,
    },
  ],
});

const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeJsonFile = (filePath: string, data: unknown): void => {
  const dirPath = path.dirname(filePath);
  ensureDir(dirPath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Created: ${filePath}`);
};

const setupCursor = (projectDir: string): void => {
  const configPath = path.join(projectDir, ".cursor", "hooks.json");
  const config = generateCursorConfig();

  if (fs.existsSync(configPath)) {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const merged = { ...existing, ...config };
    writeJsonFile(configPath, merged);
  } else {
    writeJsonFile(configPath, config);
  }
};

const setupClaudeCode = (projectDir: string): void => {
  const configPath = path.join(projectDir, ".claude", "settings.local.json");
  const config = generateClaudeCodeConfig();

  if (fs.existsSync(configPath)) {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const merged = {
      ...existing,
      hooks: {
        ...existing.hooks,
        ...config.hooks,
      },
    };
    writeJsonFile(configPath, merged);
  } else {
    writeJsonFile(configPath, config);
  }
};

const setupCopilot = (projectDir: string): void => {
  const configPath = path.join(projectDir, ".github", "hooks", "hooks.json");
  const config = generateCopilotConfig();

  if (fs.existsSync(configPath)) {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const merged = { ...existing, ...config };
    writeJsonFile(configPath, merged);
  } else {
    writeJsonFile(configPath, config);
  }
};

const TOOL_SETUPS: Record<AgentTool, { name: string; setup: (dir: string) => void }> = {
  cursor: { name: "Cursor", setup: setupCursor },
  "claude-code": { name: "Claude Code", setup: setupClaudeCode },
  copilot: { name: "GitHub Copilot", setup: setupCopilot },
};

const setupHooks = (tools: AgentTool[], projectDir: string): void => {
  console.log(`Setting up React Grab hooks in: ${projectDir}\n`);

  for (const tool of tools) {
    const toolSetup = TOOL_SETUPS[tool];
    if (toolSetup) {
      console.log(`${toolSetup.name}:`);
      try {
        toolSetup.setup(projectDir);
      } catch (error) {
        console.error(`  Error: ${error instanceof Error ? error.message : error}`);
      }
      console.log();
    }
  }

  console.log("Done! Restart your AI tool to activate the hooks.");
};

const printUsage = (): void => {
  console.log(`
Usage: npx @react-grab/agent-hooks <command> [options]

Commands:
  run                    Run the session start hook (reads clipboard)
  setup <tools...>       Setup hooks for specified tools

Tools for setup:
  cursor                 Setup for Cursor (.cursor/hooks.json)
  claude-code            Setup for Claude Code (.claude/settings.local.json)
  copilot                Setup for GitHub Copilot (.github/hooks/hooks.json)
  all                    Setup for all supported tools

Options:
  --help                 Show this help message
  --dir <dir>            Project directory (default: current directory)

Examples:
  npx @react-grab/agent-hooks run
  npx @react-grab/agent-hooks setup cursor
  npx @react-grab/agent-hooks setup claude-code copilot
  npx @react-grab/agent-hooks setup all --dir /path/to/project
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  if (command === "run") {
    await runSessionHook();
    return;
  }

  if (command === "setup") {
    const setupArgs = args.slice(1);
    let projectDir = process.cwd();

    const dirIndex = setupArgs.indexOf("--dir");
    if (dirIndex !== -1 && setupArgs[dirIndex + 1]) {
      projectDir = path.resolve(setupArgs[dirIndex + 1]);
      setupArgs.splice(dirIndex, 2);
    }

    const tools: AgentTool[] = [];
    for (const arg of setupArgs) {
      if (arg === "all") {
        tools.push(...(Object.keys(TOOL_SETUPS) as AgentTool[]));
      } else if (arg in TOOL_SETUPS) {
        tools.push(arg as AgentTool);
      } else if (!arg.startsWith("--")) {
        console.error(`Unknown tool: ${arg}`);
        process.exit(1);
      }
    }

    if (tools.length === 0) {
      console.error("No tools specified. Use --help for usage.");
      process.exit(1);
    }

    setupHooks([...new Set(tools)], projectDir);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
};

main().catch((error) => {
  console.error("[react-grab hook] failed:", error);
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
});
