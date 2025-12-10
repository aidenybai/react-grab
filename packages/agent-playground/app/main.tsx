import { createRoot } from "react-dom/client";
import { App } from "./App";

const PROVIDER_SCRIPTS: Record<string, string> = {
  claude: "/@provider-claude-code/client.global.js",
  cursor: "/@provider-cursor/client.global.js",
  opencode: "/@provider-opencode/client.global.js",
  ami: "/@provider-ami/client.global.js",
  amp: "/@provider-amp/client.global.js",
  codex: "/@provider-codex/client.global.js",
  gemini: "/@provider-gemini/client.global.js",
};

const loadProviderScript = (): Promise<void> => {
  const urlProvider = new URLSearchParams(window.location.search).get(
    "provider",
  );
  const provider = urlProvider ?? import.meta.env.VITE_PROVIDER;

  const scriptSrc = provider ? PROVIDER_SCRIPTS[provider] : undefined;

  if (!scriptSrc) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load provider: ${provider}`));
    document.head.appendChild(script);
  });
};

loadProviderScript().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
