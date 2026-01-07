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
  droid: "/@provider-droid/client.global.js",
  "visual-edit": "/@provider-visual-edit/client.global.js",
};

const loadProviderScript = (provider: string): Promise<string> => {
  const scriptSrc = PROVIDER_SCRIPTS[provider];

  if (!scriptSrc) {
    return Promise.reject(new Error(`Unknown provider: ${provider}`));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.onload = () => resolve(provider);
    script.onerror = () =>
      reject(new Error(`Failed to load provider: ${provider}`));
    document.head.appendChild(script);
  });
};

const getProvidersFromParams = (): string[] => {
  const urlProviders = new URLSearchParams(window.location.search).get(
    "provider",
  );
  const envProviders = import.meta.env.VITE_PROVIDER as string | undefined;

  const providerString = urlProviders ?? envProviders;
  if (!providerString) return [];

  return providerString
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean);
};

const loadAllProviders = async (): Promise<{ loaded: string[]; failed: string[] }> => {
  const providers = getProvidersFromParams();

  if (providers.length === 0) {
    return { loaded: [], failed: [] };
  }

  const results = await Promise.allSettled(
    providers.map((provider) => loadProviderScript(provider)),
  );

  const loaded: string[] = [];
  const failed: string[] = [];

  providers.forEach((provider, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      loaded.push(result.value);
    } else {
      console.error(`Failed to load provider "${provider}":`, result.reason);
      failed.push(provider);
    }
  });

  return { loaded, failed };
};

loadAllProviders().then(({ loaded, failed }) => {
  createRoot(document.getElementById("root")!).render(
    <App
      loadedProviders={loaded}
      failedProviders={failed}
      availableProviders={Object.keys(PROVIDER_SCRIPTS)}
    />,
  );
});
