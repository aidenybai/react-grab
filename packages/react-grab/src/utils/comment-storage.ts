import { MAX_COMMENT_ITEMS, MAX_SESSION_STORAGE_SIZE_BYTES } from "../constants.js";
import type { CommentItem } from "../types.js";
import { generateId } from "./generate-id.js";
import { logRecoverableError } from "./log-recoverable-error.js";

const COMMENT_ITEMS_KEY = "react-grab-comment-items";
const LEGACY_COMMENT_ITEMS_KEY = "react-grab-history-items";
const CLEAR_CONFIRMED_KEY = "react-grab-clear-confirmed";

const migrateFromLegacyStorage = (): void => {
  try {
    const legacyData = sessionStorage.getItem(LEGACY_COMMENT_ITEMS_KEY);
    if (legacyData && !sessionStorage.getItem(COMMENT_ITEMS_KEY)) {
      sessionStorage.setItem(COMMENT_ITEMS_KEY, legacyData);
    }
    sessionStorage.removeItem(LEGACY_COMMENT_ITEMS_KEY);
  } catch {}
};

const loadFromSessionStorage = (): CommentItem[] => {
  try {
    const serialized = sessionStorage.getItem(COMMENT_ITEMS_KEY);
    if (!serialized) return [];
    const parsed = JSON.parse(serialized) as CommentItem[];
    return parsed.map((commentItem) => ({
      ...commentItem,
      elementsCount: Math.max(1, commentItem.elementsCount ?? 1),
      previewBounds: commentItem.previewBounds ?? [],
      elementSelectors: commentItem.elementSelectors ?? [],
    }));
  } catch (error) {
    logRecoverableError("Failed to load comments from sessionStorage", error);
    return [];
  }
};

const readSessionFlag = (key: string): boolean => {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const trimToSizeLimit = (items: CommentItem[]): CommentItem[] => {
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

const persistCommentItems = (nextItems: CommentItem[]): CommentItem[] => {
  commentItems = trimToSizeLimit(nextItems);
  try {
    sessionStorage.setItem(COMMENT_ITEMS_KEY, JSON.stringify(commentItems));
  } catch (error) {
    logRecoverableError("Failed to save comments to sessionStorage", error);
  }
  return commentItems;
};

let commentItems: CommentItem[] = [];
let didConfirmClear = false;

if (typeof window !== "undefined") {
  migrateFromLegacyStorage();
  commentItems = loadFromSessionStorage();
  didConfirmClear = readSessionFlag(CLEAR_CONFIRMED_KEY);
}

export const loadComments = (): CommentItem[] => commentItems;

export const addCommentItem = (item: Omit<CommentItem, "id">): CommentItem[] =>
  persistCommentItems(
    [{ ...item, id: generateId("comment") }, ...commentItems].slice(0, MAX_COMMENT_ITEMS),
  );

export const removeCommentItem = (itemId: string): void => {
  persistCommentItems(commentItems.filter((innerItem) => innerItem.id !== itemId));
};

export const clearComments = (): CommentItem[] => persistCommentItems([]);

export const isClearConfirmed = (): boolean => didConfirmClear;

export const confirmClear = (): void => {
  didConfirmClear = true;
  try {
    sessionStorage.setItem(CLEAR_CONFIRMED_KEY, "1");
  } catch (error) {
    logRecoverableError("Failed to save clear preference to sessionStorage", error);
  }
};
