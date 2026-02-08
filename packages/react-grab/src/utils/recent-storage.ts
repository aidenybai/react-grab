import { MAX_RECENT_ITEMS } from "../constants.js";
import type { RecentItem } from "../types.js";

let recentItems: RecentItem[] = [];

const generateRecentItemId = (): string =>
  `recent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const loadRecent = (): RecentItem[] => recentItems;

export const addRecentItem = (item: Omit<RecentItem, "id">): RecentItem[] => {
  const newItem: RecentItem = {
    ...item,
    id: generateRecentItemId(),
  };
  recentItems = [newItem, ...recentItems].slice(0, MAX_RECENT_ITEMS);
  return recentItems;
};

export const removeRecentItem = (itemId: string): RecentItem[] => {
  recentItems = recentItems.filter((item) => item.id !== itemId);
  return recentItems;
};

export const clearRecent = (): RecentItem[] => {
  recentItems = [];
  return recentItems;
};
