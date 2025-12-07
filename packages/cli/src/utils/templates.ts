export type AgentIntegration = "claude-code" | "cursor" | "opencode" | "codex" | "none";

export const NEXT_APP_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_APP_ROUTER_SCRIPT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return NEXT_APP_ROUTER_SCRIPT;

  const agentScript = `<Script
              src="//unpkg.com/@react-grab/${agent}/dist/client.global.js"
              strategy="lazyOnload"
            />`;

  return `{process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            ${agentScript}
          </>
        )}`;
};

export const NEXT_PAGES_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT = (agent: AgentIntegration): string => {
  if (agent === "none") return NEXT_PAGES_ROUTER_SCRIPT;

  const agentScript = `<Script
              src="//unpkg.com/@react-grab/${agent}/dist/client.global.js"
              strategy="lazyOnload"
            />`;

  return `{process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            ${agentScript}
          </>
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
