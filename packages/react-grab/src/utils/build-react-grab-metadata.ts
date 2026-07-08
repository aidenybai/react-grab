import { VERSION } from "../constants.js";
import type { ReactGrabEntry, ReactGrabMetadata } from "../types.js";

export const buildReactGrabMetadata = (
  content: string,
  entries: ReactGrabEntry[],
): ReactGrabMetadata => ({
  version: VERSION,
  content,
  entries,
  timestamp: Date.now(),
});
