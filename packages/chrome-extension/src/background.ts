import type { CapturedElement } from "./adapters/chrome-enhanced.js";

interface Message {
  type: string;
  payload?: unknown;
}

const MAX_STORED_ELEMENTS = 50;

chrome.runtime.onInstalled.addListener(() => {
  console.log("[react-grab] Extension installed");

  chrome.storage.sync.set({
    settings: {
      enabled: true,
      hotkey: ["Meta", "C"],
      keyHoldDuration: 500,
    },
  });
});

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === "ELEMENT_CAPTURED") {
    const element = message.payload as CapturedElement;

    chrome.storage.local.get("capturedElements").then((result) => {
      const elements: CapturedElement[] = result.capturedElements || [];

      elements.unshift(element);

      if (elements.length > MAX_STORED_ELEMENTS) {
        elements.splice(MAX_STORED_ELEMENTS);
      }

      chrome.storage.local.set({ capturedElements: elements }).then(() => {
        console.log("[react-grab] Element captured and stored:", element);

        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-128.png",
          title: "Element Captured",
          message: "React element has been captured to clipboard",
          priority: 1,
        });

        chrome.action.setBadgeText({ text: String(elements.length) });
        chrome.action.setBadgeBackgroundColor({ color: "#000000" });

        sendResponse({ success: true });
      });
    });

    return true;
  }

  if (message.type === "GET_CAPTURED_ELEMENTS") {
    chrome.storage.local.get("capturedElements").then((result) => {
      sendResponse({ elements: result.capturedElements || [] });
    });
    return true;
  }

  if (message.type === "CLEAR_CAPTURED_ELEMENTS") {
    chrome.storage.local.set({ capturedElements: [] }).then(() => {
      chrome.action.setBadgeText({ text: "" });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "DELETE_ELEMENT") {
    const timestamp = message.payload as number;
    chrome.storage.local.get("capturedElements").then((result) => {
      const elements: CapturedElement[] = result.capturedElements || [];
      const filtered = elements.filter((el) => el.timestamp !== timestamp);

      chrome.storage.local.set({ capturedElements: filtered }).then(() => {
        chrome.action.setBadgeText({
          text: filtered.length > 0 ? String(filtered.length) : "",
        });
        sendResponse({ success: true });
      });
    });
    return true;
  }

  return false;
});
