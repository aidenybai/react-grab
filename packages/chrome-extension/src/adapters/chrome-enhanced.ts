import type { Adapter } from "react-grab";
import {
  captureElementScreenshot,
  generateElementSelector,
} from "../utils/capture-screenshot.js";

export interface CapturedElement {
  htmlSnippet: string;
  timestamp: number;
  url: string;
  title: string;
  screenshot?: string;
  elementSelector?: string;
}

let lastHoveredElement: Element | null = null;

export const trackHoveredElement = () => {
  const handleMouseMove = (event: MouseEvent) => {
    const target = event.target as Element;
    if (target && !target.closest("[data-react-grab-ignore]")) {
      lastHoveredElement = target;
    }
  };

  document.addEventListener("mousemove", handleMouseMove, { passive: true });

  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
  };
};

export const chromeAdapter: Adapter = {
  name: "chrome-enhanced",
  open: async (promptText: string) => {
    if (!promptText) return;

    let screenshot: string | null = null;
    let elementSelector: string | undefined;

    if (lastHoveredElement) {
      try {
        screenshot = await captureElementScreenshot(lastHoveredElement, {
          maxWidth: 400,
          maxHeight: 300,
          quality: 0.8,
        });

        elementSelector = generateElementSelector(lastHoveredElement);
      } catch (error) {
        console.warn("[react-grab] Screenshot capture failed:", error);
      }
    }

    const capturedElement: CapturedElement = {
      htmlSnippet: promptText,
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      screenshot: screenshot || undefined,
      elementSelector,
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
