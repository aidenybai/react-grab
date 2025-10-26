import type { Adapter } from "react-grab";

export interface CapturedElement {
  htmlSnippet: string;
  timestamp: number;
  url: string;
  title: string;
}

export const chromeAdapter: Adapter = {
  name: "chrome",
  open: (promptText: string) => {
    if (!promptText) return;

    const capturedElement: CapturedElement = {
      htmlSnippet: promptText,
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
    };

    chrome.runtime
      .sendMessage({
        type: "ELEMENT_CAPTURED",
        payload: capturedElement,
      })
      .catch((error) => {
        console.error("[react-grab] Failed to send message:", error);
      });
  },
};
