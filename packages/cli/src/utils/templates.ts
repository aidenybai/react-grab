export type AgentIntegration = "mcp" | "none";

export const getAgentDisplayName = (agent: string): string => {
  if (agent === "mcp") return "MCP";
  return agent;
};

export const NEXT_APP_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_APP_ROUTER_SCRIPT_WITH_AGENT = (
  _agent: AgentIntegration,
): string => {
  return NEXT_APP_ROUTER_SCRIPT;
};

export const NEXT_PAGES_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT = (
  _agent: AgentIntegration,
): string => {
  return NEXT_PAGES_ROUTER_SCRIPT;
};

export const VITE_IMPORT = `if (import.meta.env.DEV) {
  import("react-grab");
}`;

export const VITE_IMPORT_WITH_AGENT = (_agent: AgentIntegration): string => {
  return VITE_IMPORT;
};

export const WEBPACK_IMPORT = `if (process.env.NODE_ENV === "development") {
  import("react-grab");
}`;

export const WEBPACK_IMPORT_WITH_AGENT = (_agent: AgentIntegration): string => {
  return WEBPACK_IMPORT;
};

export const TANSTACK_EFFECT = `useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);`;

export const TANSTACK_EFFECT_WITH_AGENT = (_agent: AgentIntegration): string => {
  return TANSTACK_EFFECT;
};

export const ASTRO_EFFECT = `{import.meta.env.DEV && (
        <script>
          if (import.meta.env.DEV) {
            import("react-grab");
          }
        </script>
)}`;

export const ASTRO_EFFECT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return ASTRO_EFFECT;

  return `{import.meta.env.DEV && (
        <script>
          if (import.meta.env.DEV) {
            import("react-grab");
            import("@react-grab/${agent}/client");
          }
        </script>
)}`;
};

export const SCRIPT_IMPORT = 'import Script from "next/script";';
