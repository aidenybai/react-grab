import type { EditPanelState } from "../types.js";

const STORAGE_KEY_PREFIX = "react-grab:edit:";

export type PendingEdits = Record<string, number>;

// Both filePath AND lineNumber are required to disambiguate elements within
// the same file. Without that, two un-attributed elements would share a
// storage slot and one's saved edits would restore onto the other.
const storageKeyFor = (state: EditPanelState): string | null => {
  if (!state.filePath || state.lineNumber === undefined) return null;
  return `${STORAGE_KEY_PREFIX}${state.filePath}:${state.lineNumber}`;
};

const readStorage = (): Storage | null => {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
};

export const loadPendingEdits = (state: EditPanelState): PendingEdits | null => {
  const storage = readStorage();
  const key = storageKeyFor(state);
  if (!storage || !key) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const result: PendingEdits = {};
    for (const [property, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) result[property] = value;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
};

export const savePendingEdits = (state: EditPanelState, edits: PendingEdits): void => {
  const storage = readStorage();
  const key = storageKeyFor(state);
  if (!storage || !key) return;
  if (Object.keys(edits).length === 0) {
    storage.removeItem(key);
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(edits));
  } catch {
    // Storage quota or sandboxing — silently no-op.
  }
};

export const clearPendingEdits = (state: EditPanelState): void => {
  const storage = readStorage();
  const key = storageKeyFor(state);
  if (!storage || !key) return;
  storage.removeItem(key);
};
