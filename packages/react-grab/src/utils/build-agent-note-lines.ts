import { SCREENSHOT_NOTE_MAX_LINES_CAP } from "../constants.js";
import type { ReactGrabEntry } from "../types.js";

const formatEntryLocation = (entry: ReactGrabEntry): string | null => {
  if (entry.source?.filePath) {
    return entry.source.lineNumber === null
      ? entry.source.filePath
      : `${entry.source.filePath}:${entry.source.lineNumber}`;
  }
  const frameWithFile = entry.frames?.find((frame) => frame.fileName);
  if (!frameWithFile?.fileName) return null;
  return frameWithFile.lineNumber === undefined
    ? frameWithFile.fileName
    : `${frameWithFile.fileName}:${frameWithFile.lineNumber}`;
};

export const buildAgentNoteLines = (entries: ReactGrabEntry[]): string[] => {
  const noteLines: string[] = ["react-grab: the copied text carries the full payload"];
  for (const entry of entries) {
    const elementName = entry.componentName ?? entry.tagName ?? "element";
    const location = formatEntryLocation(entry);
    noteLines.push(location ? `<${elementName}> ${location}` : `<${elementName}>`);
    if (noteLines.length === SCREENSHOT_NOTE_MAX_LINES_CAP) {
      const remainingEntryCount = entries.length - (noteLines.length - 1);
      if (remainingEntryCount > 0) {
        noteLines[noteLines.length - 1] = `…and ${remainingEntryCount + 1} more elements`;
      }
      break;
    }
  }
  return noteLines;
};
