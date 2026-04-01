export type AgentIntegration = "mcp" | "none";

export const NEXT_APP_ROUTER_SCRIPT = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}`;

export const NEXT_PAGES_ROUTER_SCRIPT = NEXT_APP_ROUTER_SCRIPT;

export const VITE_IMPORT = `if (import.meta.env.DEV) {
  import("react-grab");
}`;

export const WEBPACK_IMPORT = `if (process.env.NODE_ENV === "development") {
  import("react-grab");
}`;

export const TANSTACK_EFFECT = `useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);`;

export const SCRIPT_IMPORT = 'import Script from "next/script";';
