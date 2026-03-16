export const AGENTS = [
  "claude-code",
  "cursor",
  "opencode",
  "codex",
  "gemini",
  "amp",
  "ami",
  "droid",
  "copilot",
] as const;

export type Agent = (typeof AGENTS)[number];

export type AgentIntegration = Agent | "mcp" | "none";

export const AGENT_NAMES: Record<Agent, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  opencode: "OpenCode",
  codex: "Codex",
  gemini: "Gemini",
  amp: "Amp",
  ami: "Ami",
  droid: "Droid",
  copilot: "Copilot",
};

export const getAgentDisplayName = (agent: string): string => {
  if (agent === "mcp") return "MCP";
  if (agent in AGENT_NAMES) {
    return AGENT_NAMES[agent as Agent];
  }
  return agent;
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

export const TANSTACK_EFFECT = `useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);`;

export const TANSTACK_EFFECT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return TANSTACK_EFFECT;

  return `useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
      void import("@react-grab/${agent}/client");
    }
  }, []);`;
};

export const SCRIPT_IMPORT = 'import Script from "next/script";';
