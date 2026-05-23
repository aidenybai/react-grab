import type { EditPanelState } from "../types.js";

const STORAGE_KEY_PREFIX = "react-grab:edit:";

export interface PendingEdit {
  value: number;
  unit: string;
}

export type PendingEdits = Record<string, PendingEdit>;

export interface PendingEditsEntry {
  filePath: string;
  lineNumber: number;
  edits: PendingEdits;
}

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

const parsePendingEdits = (raw: string | null): PendingEdits | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const result: PendingEdits = {};
    for (const [property, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as { value?: unknown; unit?: unknown };
      if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value)) continue;
      if (typeof candidate.unit !== "string") continue;
      result[property] = { value: candidate.value, unit: candidate.unit };
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
};

export const loadPendingEdits = (state: EditPanelState): PendingEdits | null => {
  const storage = readStorage();
  const key = storageKeyFor(state);
  if (!storage || !key) return null;
  return parsePendingEdits(storage.getItem(key));
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

// Walks the entire session storage and returns every pending entry currently
// tracked by the edit panel. Used when composing the copy prompt so the agent
// sees every still-unapplied UI tweak the user has made this session, not
// just the change they're committing right now.
export const loadAllPendingEdits = (): PendingEditsEntry[] => {
  const storage = readStorage();
  if (!storage) return [];
  const entries: PendingEditsEntry[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
    const trailing = key.slice(STORAGE_KEY_PREFIX.length);
    const lastColon = trailing.lastIndexOf(":");
    if (lastColon < 0) continue;
    const filePath = trailing.slice(0, lastColon);
    const lineNumber = Number(trailing.slice(lastColon + 1));
    if (!Number.isFinite(lineNumber)) continue;
    const edits = parsePendingEdits(storage.getItem(key));
    if (!edits) continue;
    entries.push({ filePath, lineNumber, edits });
  }
  return entries;
};
