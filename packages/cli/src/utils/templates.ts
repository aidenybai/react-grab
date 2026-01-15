export const AGENTS = [
  "claude-code",
  "cursor",
  "opencode",
  "codex",
  "gemini",
  "amp",
  "ami",
  "visual-edit",
] as const;

export type Agent = (typeof AGENTS)[number];

export type AgentIntegration = Agent | "none";

export const AGENT_NAMES: Record<Agent, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  opencode: "OpenCode",
  codex: "Codex",
  gemini: "Gemini",
  amp: "Amp",
  ami: "Ami",
  "visual-edit": "Visual Edit",
};

export const PROVIDERS = AGENTS.filter((agent) => agent !== "ami").map(
  (agent) => `@react-grab/${agent}` as const,
);

export const NEXT_APP_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_APP_ROUTER_SCRIPT_WITH_AGENT = (
  agent: AgentIntegration,
): string => {
  if (agent === "none") return NEXT_APP_ROUTER_SCRIPT;

  return `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/${agent}/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}`;
};

export const NEXT_PAGES_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT = (
  agent: AgentIntegration,
): string => {
  if (agent === "none") return NEXT_PAGES_ROUTER_SCRIPT;

  return `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/${agent}/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}`;
};

export const VITE_SCRIPT = `<script type="module">
      if (import.meta.env.DEV) {
        import("react-grab");
      }
    </script>`;

export const VITE_SCRIPT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return VITE_SCRIPT;

  return `<script type="module">
      if (import.meta.env.DEV) {
        import("react-grab");
        import("@react-grab/${agent}/client");
      }
    </script>`;
};

export const WEBPACK_IMPORT = `if (process.env.NODE_ENV === "development") {
  import("react-grab");
}`;

export const WEBPACK_IMPORT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return WEBPACK_IMPORT;

  return `if (process.env.NODE_ENV === "development") {
  import("react-grab");
  import("@react-grab/${agent}/client");
}`;
};

export const SCRIPT_IMPORT = 'import Script from "next/script";';

export const MCP_CLIENTS = [
  "cursor",
  "claude-code",
  "vscode",
  "opencode",
  "codex",
  "gemini-cli",
  // "cline",
  // "roo-cline",
  "windsurf",
  "zed",
  // "warp",
  "droid",
  // "claude",
] as const;

export type McpClient = (typeof MCP_CLIENTS)[number];

export const MCP_CLIENT_NAMES: Record<McpClient, string> = {
  "cursor": "Cursor",
  "claude-code": "Claude Code",
  "vscode": "VSCode",
  "opencode": "OpenCode",
  "codex": "Codex",
  "gemini-cli": "Gemini CLI",
  // "cline": "Cline",
  // "roo-cline": "Roo Cline",
  "windsurf": "Windsurf",
  "zed": "Zed",
  // "warp": "Warp",
  "droid": "Droid",
  // "claude": "Claude Desktop",
};
