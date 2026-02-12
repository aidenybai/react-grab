import { MAX_HISTORY_ITEMS } from "../constants.js";
import type { HistoryItem } from "../types.js";

const SESSION_STORAGE_KEY = "react-grab-history-items";

const loadFromSessionStorage = (): HistoryItem[] => {
  try {
    const serializedHistoryItems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!serializedHistoryItems) return [];
    return JSON.parse(serializedHistoryItems) as HistoryItem[];
  } catch {
    return [];
  }
};

const saveToSessionStorage = (items: HistoryItem[]): void => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

let historyItems: HistoryItem[] = loadFromSessionStorage();

const generateHistoryItemId = (): string =>
  `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const loadHistory = (): HistoryItem[] => historyItems;

export const addHistoryItem = (item: Omit<HistoryItem, "id">): HistoryItem[] => {
  const newItem: HistoryItem = {
    ...item,
    id: generateHistoryItemId(),
  };
  historyItems = [newItem, ...historyItems].slice(0, MAX_HISTORY_ITEMS);
  saveToSessionStorage(historyItems);
  return historyItems;
};

export const removeHistoryItem = (itemId: string): HistoryItem[] => {
  historyItems = historyItems.filter((item) => item.id !== itemId);
  saveToSessionStorage(historyItems);
  return historyItems;
};

export const clearHistory = (): HistoryItem[] => {
  historyItems = [];
  saveToSessionStorage(historyItems);
  return historyItems;
};
