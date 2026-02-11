import { MAX_RECENT_ITEMS } from "../constants.js";
import type { RecentItem } from "../types.js";

const SESSION_STORAGE_KEY = "react-grab-recent-items";

const loadFromSessionStorage = (): RecentItem[] => {
  try {
    const serializedRecentItems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!serializedRecentItems) return [];
    return JSON.parse(serializedRecentItems) as RecentItem[];
  } catch {
    return [];
  }
};

const saveToSessionStorage = (items: RecentItem[]): void => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

let recentItems: RecentItem[] = loadFromSessionStorage();

const generateRecentItemId = (): string =>
  `recent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const loadRecent = (): RecentItem[] => recentItems;

export const addRecentItem = (item: Omit<RecentItem, "id">): RecentItem[] => {
  const newItem: RecentItem = {
    ...item,
    id: generateRecentItemId(),
  };
  recentItems = [newItem, ...recentItems].slice(0, MAX_RECENT_ITEMS);
  saveToSessionStorage(recentItems);
  return recentItems;
};

export const removeRecentItem = (itemId: string): RecentItem[] => {
  recentItems = recentItems.filter((item) => item.id !== itemId);
  saveToSessionStorage(recentItems);
  return recentItems;
};

export const clearRecent = (): RecentItem[] => {
  recentItems = [];
  saveToSessionStorage(recentItems);
  return recentItems;
};
