import {
  MAX_COMMENT_ITEMS,
  MAX_SESSION_STORAGE_SIZE_BYTES,
} from "../constants.js";
import type { CommentItem } from "../types.js";
import { generateId } from "./generate-id.js";
import { logRecoverableError } from "./log-recoverable-error.js";

const SESSION_STORAGE_KEY = "react-grab-comment-items";
const LEGACY_SESSION_STORAGE_KEY = "react-grab-history-items";
const CLEAR_CONFIRMED_KEY = "react-grab-clear-confirmed";

let didConfirmClear = false;

const migrateFromLegacyStorage = (): void => {
  try {
    const legacyData = sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
    if (legacyData && !sessionStorage.getItem(SESSION_STORAGE_KEY)) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, legacyData);
    }
    sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  } catch {
    // HACK: sessionStorage can throw in private browsing or when quota is exceeded
  }
};

migrateFromLegacyStorage();

const loadFromSessionStorage = (): CommentItem[] => {
  try {
    didConfirmClear = sessionStorage.getItem(CLEAR_CONFIRMED_KEY) === "1";

    const serializedCommentItems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!serializedCommentItems) return [];
    const parsedCommentItems = JSON.parse(
      serializedCommentItems,
    ) as CommentItem[];
    return parsedCommentItems.map((commentItem) => ({
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

const saveToSessionStorage = (items: CommentItem[]): CommentItem[] => {
  const trimmedItems = trimToSizeLimit(items);
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmedItems));
  } catch (error) {
    // HACK: sessionStorage can throw in private browsing or when quota is exceeded
    logRecoverableError("Failed to save comments to sessionStorage", error);
  }
  return trimmedItems;
};

let commentItems: CommentItem[] = loadFromSessionStorage();

export const loadComments = (): CommentItem[] => commentItems;

export const addCommentItem = (
  item: Omit<CommentItem, "id">,
): CommentItem[] => {
  const newItem: CommentItem = {
    ...item,
    id: generateId("comment"),
  };
  commentItems = saveToSessionStorage(
    [newItem, ...commentItems].slice(0, MAX_COMMENT_ITEMS),
  );
  return commentItems;
};

export const removeCommentItem = (itemId: string): CommentItem[] => {
  commentItems = saveToSessionStorage(
    commentItems.filter((item) => item.id !== itemId),
  );
  return commentItems;
};

export const clearComments = (): CommentItem[] => {
  commentItems = saveToSessionStorage([]);
  return commentItems;
};

export const shouldSkipClearPrompt = (): boolean => didConfirmClear;

export const confirmClearPreference = (): void => {
  didConfirmClear = true;
  try {
    sessionStorage.setItem(CLEAR_CONFIRMED_KEY, "1");
  } catch (error) {
    // HACK: sessionStorage can throw in private browsing or when quota is exceeded
    logRecoverableError("Failed to save clear preference to sessionStorage", error);
  }
};
