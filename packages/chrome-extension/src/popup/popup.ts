import type { CapturedElement } from "../adapters/chrome-enhanced.js";

interface Settings {
  enabled: boolean;
  hotkey: string[];
  keyHoldDuration: number;
}

const loadSettings = async (): Promise<Settings> => {
  const result = await chrome.storage.sync.get("settings");
  return (
    result.settings || {
      enabled: true,
      hotkey: ["Meta", "C"],
      keyHoldDuration: 500,
    }
  );
};

const saveSettings = async (settings: Settings): Promise<void> => {
  await chrome.storage.sync.set({ settings });
};

const loadCapturedElements = async (): Promise<CapturedElement[]> => {
  const response = await chrome.runtime.sendMessage({
    type: "GET_CAPTURED_ELEMENTS",
  });
  return response.elements || [];
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
};

const renderElements = async (): Promise<void> => {
  const elements = await loadCapturedElements();
  const container = document.getElementById("elements");

  if (!container) return;

  if (elements.length === 0) {
    container.innerHTML = '<div class="empty">No captured elements yet</div>';
    return;
  }

  container.innerHTML = elements
    .map(
      (element) => `
    <div class="element" data-timestamp="${element.timestamp}">
      ${
        element.screenshot
          ? `<img class="element-thumbnail" src="${element.screenshot}" alt="Element preview" data-timestamp="${element.timestamp}" />`
          : '<div class="element-thumbnail-placeholder">📷</div>'
      }
      <div class="element-info">
        <div class="element-title">${element.title || "Untitled"}</div>
        <div class="element-url">${element.url}</div>
        <div class="element-time">${formatTime(element.timestamp)}</div>
      </div>
      <div class="element-actions">
        <button class="copy-btn" data-timestamp="${element.timestamp}">Copy</button>
        <button class="delete-btn danger" data-timestamp="${element.timestamp}">Delete</button>
      </div>
    </div>
  `,
    )
    .join("");

  container.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const timestamp = Number((e.target as HTMLElement).dataset.timestamp);
      const element = elements.find((el) => el.timestamp === timestamp);
      if (element) {
        await navigator.clipboard.writeText(element.htmlSnippet);
        const button = e.target as HTMLButtonElement;
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1000);
      }
    });
  });

  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const timestamp = Number((e.target as HTMLElement).dataset.timestamp);
      await chrome.runtime.sendMessage({
        type: "DELETE_ELEMENT",
        payload: timestamp,
      });
      await renderElements();
    });
  });

  container.querySelectorAll(".element-thumbnail").forEach((thumbnail) => {
    thumbnail.addEventListener("click", (e) => {
      const timestamp = Number((e.target as HTMLElement).dataset.timestamp);
      const element = elements.find((el) => el.timestamp === timestamp);
      if (element?.screenshot) {
        showModal(element.screenshot);
      }
    });
  });
};

const showModal = (imageSrc: string): void => {
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage") as HTMLImageElement;

  if (modal && modalImage) {
    modalImage.src = imageSrc;
    modal.classList.add("active");
  }
};

const hideModal = (): void => {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.classList.remove("active");
  }
};

const init = async (): Promise<void> => {
  const settings = await loadSettings();

  const enabledCheckbox = document.getElementById("enabled") as HTMLInputElement;
  const hotkeyInput = document.getElementById("hotkey") as HTMLInputElement;
  const durationInput = document.getElementById("duration") as HTMLInputElement;
  const clearAllBtn = document.getElementById("clearAll");

  if (enabledCheckbox) {
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener("change", async () => {
      settings.enabled = enabledCheckbox.checked;
      await saveSettings(settings);
    });
  }

  if (hotkeyInput) {
    hotkeyInput.value = settings.hotkey.join(",");
    hotkeyInput.addEventListener("blur", async () => {
      settings.hotkey = hotkeyInput.value.split(",").map((k) => k.trim());
      await saveSettings(settings);
    });
  }

  if (durationInput) {
    durationInput.value = String(settings.keyHoldDuration);
    durationInput.addEventListener("blur", async () => {
      settings.keyHoldDuration = Number(durationInput.value);
      await saveSettings(settings);
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "CLEAR_CAPTURED_ELEMENTS" });
      await renderElements();
    });
  }

  await renderElements();

  const modalCloseBtn = document.getElementById("modalClose");
  const modal = document.getElementById("modal");

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", hideModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal();
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.capturedElements) {
      void renderElements();
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void init();
  });
} else {
  void init();
}
