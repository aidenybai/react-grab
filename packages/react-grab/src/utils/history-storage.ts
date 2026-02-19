import {
  MAX_HISTORY_ITEMS,
  MAX_SESSION_STORAGE_SIZE_BYTES,
} from "../constants.js";
import type { HistoryItem } from "../types.js";

const SESSION_STORAGE_KEY = "react-grab-history-items";

const loadFromSessionStorage = (): HistoryItem[] => {
  try {
    const serializedHistoryItems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!serializedHistoryItems) return [];
    const parsedHistoryItems = JSON.parse(
      serializedHistoryItems,
    ) as HistoryItem[];
    return parsedHistoryItems.map((historyItem) => ({
      ...historyItem,
      elementsCount: Math.max(1, historyItem.elementsCount ?? 1),
      previewBounds: historyItem.previewBounds ?? [],
      elementSelectors: historyItem.elementSelectors ?? [],
    }));
  } catch {
    return [];
  }
};

const trimToSizeLimit = (items: HistoryItem[]): HistoryItem[] => {
  let trimmedItems = items;
  while (trimmedItems.length > 0) {
    const serialized = JSON.stringify(trimmedItems);
    if (new Blob([serialized]).size <= MAX_SESSION_STORAGE_SIZE_BYTES) {
      return trimmedItems;
    }
    trimmedItems = trimmedItems.slice(0, -1);
  }
  return trimmedItems;
};

const saveToSessionStorage = (items: HistoryItem[]): void => {
  try {
    const trimmedItems = trimToSizeLimit(items);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmedItems));
    // HACK: sessionStorage can throw in private browsing or when quota is exceeded
  } catch {}
};

let historyItems: HistoryItem[] = loadFromSessionStorage();

const generateHistoryItemId = (): string =>
  `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const loadHistory = (): HistoryItem[] => historyItems;

export const addHistoryItem = (
  item: Omit<HistoryItem, "id">,
): HistoryItem[] => {
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
