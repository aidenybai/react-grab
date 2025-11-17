interface TabState {
  enabled: boolean;
}

const tabStates = new Map<number, TabState>();

const getTabState = (tabId: number): TabState => {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, { enabled: true });
  }
  return tabStates.get(tabId)!;
};

const updateActionIcon = async (tabId: number, enabled: boolean) => {
  const title = enabled ? "React Grab (Active)" : "React Grab (Inactive)";
  const badgeText = enabled ? "" : "OFF";
  const badgeColor = "#FF40E0";

  await chrome.action.setTitle({ tabId, title });
  await chrome.action.setBadgeText({ tabId, text: badgeText });
  if (badgeText) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  }
};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const state = getTabState(tab.id);
  state.enabled = !state.enabled;

  await updateActionIcon(tab.id, state.enabled);

  await chrome.tabs.sendMessage(tab.id, {
    type: "REACT_GRAB_TOGGLE",
    enabled: state.enabled,
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    const state = getTabState(tabId);
    await updateActionIcon(tabId, state.enabled);
  }
});
