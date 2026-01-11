import { createVisualEditAgentProvider } from "@react-grab/visual-edit/client";
import { init, setGlobalIDEInfo } from "react-grab/core";
import { getDefaultRelayClient } from "@react-grab/relay/client";

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
  const api = init({
    // activationKey: "Space",
    // activationMode: "hold",
    // keyHoldDuration: 300,
    // allowActivationInsideInput: false,
    // maxContextLines: 3,
  });

  // Subscribe to IDE info changes from the relay client
  const relayClient = getDefaultRelayClient();
  relayClient.onIDEInfoChange((ideInfo) => {
    setGlobalIDEInfo(ideInfo);
  });

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

    const agent = {
      provider,
      getOptions,
      storage: sessionStorage,
      onStart,
      onComplete,
      onUndo,
    };
    api.registerPlugin({
      name: "visual-edit-agent",
      actions: [
        {
          id: "edit-with-visual-edit",
          label: "Visual Edit",
          shortcut: "Enter",
          onAction: (context) => {
            context.enterPromptMode?.(agent);
          },
          agent,
        },
      ],
    });
  }

  window.__REACT_GRAB__ = api;
}
