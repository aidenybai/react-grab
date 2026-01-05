import { createVisualEditAgentProvider } from "@react-grab/visual-edit/client";
import { createClient } from "@react-grab/playwright/client";
import { init } from "react-grab/core";

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

const ABUSIVE_REGION_TIMEZONES = ["Asia/Kolkata", "Asia/Calcutta"];

const isUserInAbusiveRegion = (): boolean => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ABUSIVE_REGION_TIMEZONES.includes(timezone);
  } catch {
    return false;
  }
};

if (typeof window !== "undefined" && !window.__REACT_GRAB__) {
  const api = init();

  api.registerPlugin({
    name: "website-events",
    hooks: {
      onActivate: () => {
        window.dispatchEvent(new CustomEvent("react-grab:activated"));
      },
      onDeactivate: () => {
        window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
      },
    },
  });

  // HACK: Temporarily disable visual edit for abusive regions
  if (!isUserInAbusiveRegion()) {
    const { provider, getOptions, onStart, onComplete, onUndo } =
      createVisualEditAgentProvider({ apiEndpoint: "/api/visual-edit" });

    api.registerPlugin({
      name: "visual-edit-agent",
      agent: {
        provider,
        getOptions,
        storage: sessionStorage,
        onStart,
        onComplete,
        onUndo,
      },
    });
  }

  window.__REACT_GRAB__ = api;

  const playwrightClient = createClient({
    onConnect: () => console.log("[playwright] connected"),
    onDisconnect: () => console.log("[playwright] disconnected"),
    onError: (error) => console.error("[playwright] error:", error),
  });
  playwrightClient.connect();
}
