const STORAGE_KEY = "react_grab_enabled";

const getGlobalEnabled = async (): Promise<boolean> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const enabled = result[STORAGE_KEY] ?? true;
  return enabled;
};

const setGlobalEnabled = async (enabled: boolean): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
};

const updateActionIcon = async (
  tabId: number,
  enabled: boolean,
): Promise<void> => {
  const title = enabled ? "React Grab (Active)" : "React Grab (Inactive)";
  const badgeText = enabled ? "" : "OFF";
  const badgeColor = "#FF40E0";

  await chrome.action.setTitle({ tabId, title });
  await chrome.action.setBadgeText({ tabId, text: badgeText });
  if (badgeText) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_STATE") {
    getGlobalEnabled().then((enabled) => {
      sendResponse({ enabled });
    });
    return true;
  }
  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const currentEnabled = await getGlobalEnabled();
  const newEnabled = !currentEnabled;
  await setGlobalEnabled(newEnabled);

  await updateActionIcon(tab.id, newEnabled);

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "REACT_GRAB_TOGGLE",
      enabled: newEnabled,
    });
  } catch {
    // HACK: Content script may not be ready yet
  }

  const allTabs = await chrome.tabs.query({});
  for (const otherTab of allTabs) {
    if (otherTab.id && otherTab.id !== tab.id) {
      await updateActionIcon(otherTab.id, newEnabled);
      try {
        await chrome.tabs.sendMessage(otherTab.id, {
          type: "REACT_GRAB_TOGGLE",
          enabled: newEnabled,
        });
      } catch {
        // Tab may not have content script loaded
      }
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    const enabled = await getGlobalEnabled();
    await updateActionIcon(tabId, enabled);
  }
});
