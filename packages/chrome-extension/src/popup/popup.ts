import type { CapturedElement } from "../adapters/chrome-enhanced.js";

interface Settings {
  enabled: boolean;
  hotkey: string[];
  keyHoldDuration: number;
}

interface LoadSettingsResult {
  success: boolean;
  settings?: Settings;
  error?: string;
}

interface LoadElementsResult {
  success: boolean;
  elements?: CapturedElement[];
  error?: string;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  hotkey: ["Meta", "C"],
  keyHoldDuration: 500,
};

const loadSettings = async (): Promise<LoadSettingsResult> => {
  try {
    const result = await chrome.storage.sync.get("settings");
    return {
      success: true,
      settings: result.settings || DEFAULT_SETTINGS,
    };
  } catch (error) {
    console.error("[react-grab] Failed to load settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      settings: DEFAULT_SETTINGS,
    };
  }
};

const saveSettings = async (settings: Settings): Promise<boolean> => {
  try {
    await chrome.storage.sync.set({ settings });
    return true;
  } catch (error) {
    console.error("[react-grab] Failed to save settings:", error);
    showToast("Failed to save settings", "error");
    return false;
  }
};

const loadCapturedElements = async (): Promise<LoadElementsResult> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_CAPTURED_ELEMENTS",
    });
    return {
      success: true,
      elements: response.elements || [],
    };
  } catch (error) {
    console.error("[react-grab] Failed to load elements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      elements: [],
    };
  }
};

const showToast = (message: string, type: "success" | "error" | "info" = "info"): void => {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("toast-show"), 10);
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

const setLoadingState = (isLoading: boolean): void => {
  const container = document.getElementById("elements");
  if (!container) return;

  if (isLoading) {
    container.innerHTML = '<div class="loading">Loading elements...</div>';
  }
};

const showError = (message: string): void => {
  const container = document.getElementById("elements");
  if (!container) return;

  container.innerHTML = `
    <div class="error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">${message}</div>
      <button id="retryBtn" class="retry-btn">Retry</button>
    </div>
  `;

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => void renderElements());
  }
};

const formatTime = (timestamp: number): string => {
  try {
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
    if (seconds > 0) return `${seconds}s ago`;
    return "just now";
  } catch (error) {
    console.error("[react-grab] Failed to format time:", error);
    return "unknown";
  }
};

const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const renderElements = async (): Promise<void> => {
  setLoadingState(true);

  const result = await loadCapturedElements();
  const container = document.getElementById("elements");

  if (!container) return;

  if (!result.success) {
    showError(result.error || "Failed to load elements");
    return;
  }

  const elements = result.elements || [];

  if (elements.length === 0) {
    container.innerHTML = '<div class="empty">No captured elements yet<br><small>Hold ⌘C and click elements in your React app</small></div>';
    return;
  }

  container.innerHTML = elements
    .map(
      (element) => `
    <div class="element" data-timestamp="${element.timestamp}">
      ${
        element.screenshot
          ? `<img class="element-thumbnail" src="${escapeHtml(element.screenshot)}" alt="Element preview" data-timestamp="${element.timestamp}" loading="lazy" />`
          : '<div class="element-thumbnail-placeholder">📷</div>'
      }
      <div class="element-info">
        <div class="element-title">${escapeHtml(element.title || "Untitled")}</div>
        <div class="element-url">${escapeHtml(element.url)}</div>
        <div class="element-time">${formatTime(element.timestamp)}</div>
      </div>
      <div class="element-actions">
        <button class="copy-btn" data-timestamp="${element.timestamp}" title="Copy HTML snippet">Copy</button>
        <button class="delete-btn danger" data-timestamp="${element.timestamp}" title="Delete element">Delete</button>
      </div>
    </div>
  `,
    )
    .join("");

  container.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const timestamp = Number(target.dataset.timestamp);
      const element = elements.find((el) => el.timestamp === timestamp);

      if (!element) {
        showToast("Element not found", "error");
        return;
      }

      try {
        await navigator.clipboard.writeText(element.htmlSnippet);
        const button = target as HTMLButtonElement;
        const originalText = button.textContent;
        button.textContent = "Copied!";
        button.disabled = true;
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 1000);
        showToast("Copied to clipboard", "success");
      } catch (error) {
        console.error("[react-grab] Failed to copy:", error);
        showToast("Failed to copy to clipboard", "error");
      }
    });
  });

  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const timestamp = Number(target.dataset.timestamp);

      const button = target as HTMLButtonElement;
      button.disabled = true;
      button.textContent = "Deleting...";

      try {
        await chrome.runtime.sendMessage({
          type: "DELETE_ELEMENT",
          payload: timestamp,
        });
        showToast("Element deleted", "success");
        await renderElements();
      } catch (error) {
        console.error("[react-grab] Failed to delete:", error);
        showToast("Failed to delete element", "error");
        button.disabled = false;
        button.textContent = "Delete";
      }
    });
  });

  container.querySelectorAll(".element-thumbnail").forEach((thumbnail) => {
    thumbnail.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const timestamp = Number(target.dataset.timestamp);
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
  try {
    const settingsResult = await loadSettings();
    const settings = settingsResult.settings || DEFAULT_SETTINGS;

    if (!settingsResult.success) {
      showToast("Failed to load settings, using defaults", "error");
    }

    const enabledCheckbox = document.getElementById("enabled") as HTMLInputElement;
    const hotkeyInput = document.getElementById("hotkey") as HTMLInputElement;
    const durationInput = document.getElementById("duration") as HTMLInputElement;
    const clearAllBtn = document.getElementById("clearAll");

    if (enabledCheckbox) {
      enabledCheckbox.checked = settings.enabled;
      enabledCheckbox.addEventListener("change", async () => {
        settings.enabled = enabledCheckbox.checked;
        const success = await saveSettings(settings);
        if (success) {
          showToast(
            settings.enabled ? "React Grab enabled" : "React Grab disabled",
            "success"
          );
        }
      });
    }

    if (hotkeyInput) {
      hotkeyInput.value = settings.hotkey.join(",");
      hotkeyInput.addEventListener("blur", async () => {
        const newHotkey = hotkeyInput.value.split(",").map((k) => k.trim()).filter(Boolean);
        if (newHotkey.length === 0) {
          showToast("Hotkey cannot be empty", "error");
          hotkeyInput.value = settings.hotkey.join(",");
          return;
        }
        settings.hotkey = newHotkey;
        const success = await saveSettings(settings);
        if (success) {
          showToast("Hotkey updated", "success");
        }
      });
    }

    if (durationInput) {
      durationInput.value = String(settings.keyHoldDuration);
      durationInput.addEventListener("blur", async () => {
        const newDuration = Number(durationInput.value);
        if (isNaN(newDuration) || newDuration < 0) {
          showToast("Duration must be a positive number", "error");
          durationInput.value = String(settings.keyHoldDuration);
          return;
        }
        settings.keyHoldDuration = newDuration;
        const success = await saveSettings(settings);
        if (success) {
          showToast("Duration updated", "success");
        }
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async () => {
        const confirmed = confirm("Are you sure you want to clear all captured elements?");
        if (!confirmed) return;

        clearAllBtn.disabled = true;
        clearAllBtn.textContent = "Clearing...";

        try {
          await chrome.runtime.sendMessage({ type: "CLEAR_CAPTURED_ELEMENTS" });
          showToast("All elements cleared", "success");
          await renderElements();
        } catch (error) {
          console.error("[react-grab] Failed to clear elements:", error);
          showToast("Failed to clear elements", "error");
        } finally {
          clearAllBtn.disabled = false;
          clearAllBtn.textContent = "Clear All";
        }
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
  } catch (error) {
    console.error("[react-grab] Fatal error during initialization:", error);
    const container = document.getElementById("elements");
    if (container) {
      container.innerHTML = `
        <div class="error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Failed to initialize popup</div>
          <button id="reloadBtn" class="retry-btn">Reload</button>
        </div>
      `;
      const reloadBtn = document.getElementById("reloadBtn");
      if (reloadBtn) {
        reloadBtn.addEventListener("click", () => window.location.reload());
      }
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void init();
  });
} else {
  void init();
}
