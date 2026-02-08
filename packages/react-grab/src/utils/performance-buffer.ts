import {
  PERF_BUFFER_SIZE,
  ACTIVITY_TYPE_EMPTY,
  EFFECT_TYPE_PASSIVE,
  RENDER_PHASE_MOUNT,
  CAUSE_TYPE_INITIAL,
} from "../constants.js";

export interface ActivityEntry {
  type: number;
  startTime: number;
  endTime: number;
  fiberId: number;
  componentNameIndex: number;
  sourceFileIndex: number;
  lineNumber: number;
  selfTime: number;
  effectType: number;
  effectPhase: number;
  renderPhase: number;
  causeType: number;
}

const INDEX_MASK = PERF_BUFFER_SIZE - 1;

const createEmptyEntry = (): ActivityEntry => ({
  type: ACTIVITY_TYPE_EMPTY,
  startTime: 0,
  endTime: 0,
  fiberId: 0,
  componentNameIndex: -1,
  sourceFileIndex: -1,
  lineNumber: 0,
  selfTime: 0,
  effectType: EFFECT_TYPE_PASSIVE,
  effectPhase: 0,
  renderPhase: RENDER_PHASE_MOUNT,
  causeType: CAUSE_TYPE_INITIAL,
});

const buffer: ActivityEntry[] = Array.from(
  { length: PERF_BUFFER_SIZE },
  createEmptyEntry,
);

let writeIndex = 0;
let entryCount = 0;

const stringTable: string[] = [];
const stringToIndex = new Map<string, number>();

export const internString = (str: string): number => {
  const existing = stringToIndex.get(str);
  if (existing !== undefined) return existing;

  const index = stringTable.length;
  stringTable.push(str);
  stringToIndex.set(str, index);
  return index;
};

export const getString = (index: number): string | null => {
  if (index < 0 || index >= stringTable.length) return null;
  return stringTable[index];
};

export const recordActivity = (
  type: number,
  startTime: number,
  endTime: number,
  fiberId: number,
  componentName: string,
  sourceFile: string | null,
  lineNumber: number,
  selfTime: number,
  effectType: number = EFFECT_TYPE_PASSIVE,
  effectPhase: number = 0,
  renderPhase: number = RENDER_PHASE_MOUNT,
  causeType: number = CAUSE_TYPE_INITIAL,
): void => {
  const entry = buffer[writeIndex];

  entry.type = type;
  entry.startTime = startTime;
  entry.endTime = endTime;
  entry.fiberId = fiberId;
  entry.componentNameIndex = internString(componentName);
  entry.sourceFileIndex = sourceFile ? internString(sourceFile) : -1;
  entry.lineNumber = lineNumber;
  entry.selfTime = selfTime;
  entry.effectType = effectType;
  entry.effectPhase = effectPhase;
  entry.renderPhase = renderPhase;
  entry.causeType = causeType;

  writeIndex = (writeIndex + 1) & INDEX_MASK;
  if (entryCount < PERF_BUFFER_SIZE) entryCount++;
};

export const getEntriesInWindow = (
  windowStart: number,
  windowEnd: number,
): ActivityEntry[] => {
  const results: ActivityEntry[] = [];

  const readStart = entryCount < PERF_BUFFER_SIZE ? 0 : writeIndex;

  for (let i = 0; i < entryCount; i++) {
    const idx = (readStart + i) & INDEX_MASK;
    const entry = buffer[idx];

    if (
      entry.type !== ACTIVITY_TYPE_EMPTY &&
      entry.endTime >= windowStart &&
      entry.startTime <= windowEnd
    ) {
      results.push(entry);
    }
  }

  return results;
};

export const getAllEntries = (): ActivityEntry[] => {
  const results: ActivityEntry[] = [];

  const readStart = entryCount < PERF_BUFFER_SIZE ? 0 : writeIndex;

  for (let i = 0; i < entryCount; i++) {
    const idx = (readStart + i) & INDEX_MASK;
    const entry = buffer[idx];

    if (entry.type !== ACTIVITY_TYPE_EMPTY) {
      results.push(entry);
    }
  }

  return results;
};

export const clearBuffer = (): void => {
  for (let i = 0; i < PERF_BUFFER_SIZE; i++) {
    buffer[i].type = ACTIVITY_TYPE_EMPTY;
  }
  writeIndex = 0;
  entryCount = 0;
  stringTable.length = 0;
  stringToIndex.clear();
};

export const getBufferStats = (): {
  entryCount: number;
  bufferSize: number;
  stringTableSize: number;
} => ({
  entryCount,
  bufferSize: PERF_BUFFER_SIZE,
  stringTableSize: stringTable.length,
});
