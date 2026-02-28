import {
  MAX_EVENT_CONTEXT_ENTRIES,
  AMBIENT_DEDUP_THRESHOLD_MS,
  AMBIENT_TRAIL_STALENESS_MS,
} from "../constants.js";
import type { EventContextEntry } from "../types.js";

const generateEntryId = (): string =>
  `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const formatEntryLine = (entry: EventContextEntry, index: number): string => {
  let line = `${index + 1}. [${entry.interactionType}] <${entry.tagName}>`;

  if (entry.componentName) {
    line += ` in ${entry.componentName}`;
  }

  if (entry.filePath) {
    line += ` (${entry.filePath}`;
    if (entry.lineNumber !== null) {
      line += `:${entry.lineNumber}`;
    }
    line += `)`;
  }

  return line;
};

export const createEventContextStore = () => {
  let entries: EventContextEntry[] = [];

  const isDuplicate = (incoming: Omit<EventContextEntry, "id">): boolean => {
    if (entries.length === 0) return false;
    const mostRecent = entries[0];
    const timeDelta = incoming.timestamp - mostRecent.timestamp;
    if (timeDelta > AMBIENT_DEDUP_THRESHOLD_MS) return false;
    return (
      mostRecent.selector !== null &&
      mostRecent.selector === incoming.selector &&
      mostRecent.interactionType === incoming.interactionType
    );
  };

  const shouldSubsumeHover = (
    incoming: Omit<EventContextEntry, "id">,
  ): boolean => {
    if (entries.length === 0) return false;
    if (incoming.interactionType !== "click") return false;
    const mostRecent = entries[0];
    if (mostRecent.interactionType !== "hover") return false;
    const timeDelta = incoming.timestamp - mostRecent.timestamp;
    if (timeDelta > AMBIENT_DEDUP_THRESHOLD_MS) return false;
    return (
      mostRecent.selector !== null && mostRecent.selector === incoming.selector
    );
  };

  const addEntry = (
    entry: Omit<EventContextEntry, "id">,
  ): EventContextEntry[] => {
    if (isDuplicate(entry)) return entries;

    const newEntry: EventContextEntry = {
      ...entry,
      id: generateEntryId(),
    };

    if (shouldSubsumeHover(entry)) {
      entries = [newEntry, ...entries.slice(1)].slice(
        0,
        MAX_EVENT_CONTEXT_ENTRIES,
      );
    } else {
      entries = [newEntry, ...entries].slice(0, MAX_EVENT_CONTEXT_ENTRIES);
    }

    return entries;
  };

  const getEntries = (): EventContextEntry[] => entries;

  const getFreshEntries = (): EventContextEntry[] => {
    const cutoff = Date.now() - AMBIENT_TRAIL_STALENESS_MS;
    return entries.filter((entry) => entry.timestamp >= cutoff);
  };

  const clear = (): void => {
    entries = [];
  };

  const formatTrailForCopy = (): string => {
    const freshEntries = getFreshEntries();
    if (freshEntries.length === 0) return "";

    const lines = freshEntries.map((entry, index) =>
      formatEntryLine(entry, index),
    );

    return `Recent user interactions (most recent first):\n\n${lines.join("\n")}`;
  };

  return {
    addEntry,
    getEntries,
    getFreshEntries,
    clear,
    formatTrailForCopy,
  };
};
