import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  getDisplayName,
  isCompositeFiber,
  type Fiber,
} from "bippy";
import { getSource, isSourceFile } from "bippy/source";
import { VERSION, VIEWPORT_CLIPBOARD_DEBOUNCE_MS } from "../constants.js";
import { collectViewportElements } from "../utils/collect-viewport-elements.js";
import { getTagName } from "../utils/get-tag-name.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import { isUsefulComponentName } from "../utils/is-useful-component-name.js";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";
const WEB_CUSTOM_MIME_TYPE = `web ${REACT_GRAB_MIME_TYPE}`;

interface ViewportEntry {
  tagName: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface ViewportClipboardController {
  scheduleWrite: () => void;
  cancel: () => void;
}

const getComponentNameFromFiber = (fiber: Fiber): string | undefined => {
  let currentFiber: Fiber | null = fiber.return ?? null;
  while (currentFiber) {
    if (isCompositeFiber(currentFiber)) {
      const name = getDisplayName(currentFiber.type);
      if (name && isUsefulComponentName(name)) {
        return name;
      }
    }
    currentFiber = currentFiber.return ?? null;
  }
  return undefined;
};

const resolveElementEntry = async (element: Element): Promise<ViewportEntry | null> => {
  const fiber = getFiberFromHostInstance(element);
  if (!fiber) return null;

  const tagName = getTagName(element);
  const componentName = getComponentNameFromFiber(fiber);

  let filePath: string | undefined;
  let lineNumber: number | undefined;
  let columnNumber: number | undefined;

  try {
    const source = await getSource(fiber);
    if (source?.fileName && isSourceFile(source.fileName)) {
      filePath = normalizeFilePath(source.fileName);
      lineNumber = source.lineNumber ?? undefined;
      columnNumber = source.columnNumber ?? undefined;
    }
  } catch {}

  return { tagName, componentName, filePath, lineNumber, columnNumber };
};

const formatEntryReference = (entry: ViewportEntry): string => {
  const tag = entry.componentName
    ? `<${entry.tagName}>`
    : `<${entry.tagName} />`;

  const locationParts: string[] = [];
  if (entry.componentName) {
    locationParts.push(`in ${entry.componentName}`);
  }
  if (entry.filePath) {
    const locationSuffix =
      entry.lineNumber != null && entry.columnNumber != null
        ? `:${entry.lineNumber}:${entry.columnNumber}`
        : entry.lineNumber != null
          ? `:${entry.lineNumber}`
          : "";
    locationParts.push(`(at ${entry.filePath}${locationSuffix})`);
  }

  const location = locationParts.length > 0 ? ` ${locationParts.join(" ")}` : "";
  return `[${tag}${location}]`;
};

const writeToClipboard = async (content: string, metadata: string): Promise<boolean> => {
  if (!navigator.clipboard) return false;

  try {
    if (typeof ClipboardItem !== "undefined") {
      const textBlob = new Blob([content], { type: "text/plain" });
      const customBlob = new Blob([metadata], { type: REACT_GRAB_MIME_TYPE });
      const item = new ClipboardItem({
        "text/plain": textBlob,
        [WEB_CUSTOM_MIME_TYPE]: customBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {}

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {}

  return false;
};

export const createViewportClipboard = (): ViewportClipboardController => {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastContentHash = "";
  let isWriting = false;

  const performWrite = async (): Promise<void> => {
    if (isWriting) return;
    if (!isInstrumentationActive()) return;

    isWriting = true;
    try {
      const elements = collectViewportElements();
      if (elements.length === 0) return;

      const entryResults = await Promise.allSettled(
        elements.map(resolveElementEntry),
      );

      const entries: ViewportEntry[] = [];
      for (const result of entryResults) {
        if (result.status === "fulfilled" && result.value) {
          entries.push(result.value);
        }
      }

      if (entries.length === 0) return;

      const deduplicatedEntries: ViewportEntry[] = [];
      const seenKeys = new Set<string>();
      for (const entry of entries) {
        const deduplicationKey = entry.componentName && entry.filePath
          ? `${entry.componentName}:${entry.filePath}:${entry.lineNumber ?? ""}`
          : `${entry.tagName}:${entry.filePath ?? ""}:${entry.lineNumber ?? ""}`;
        if (seenKeys.has(deduplicationKey)) continue;
        seenKeys.add(deduplicationKey);
        deduplicatedEntries.push(entry);
      }

      const references = deduplicatedEntries.map(formatEntryReference);
      const content = references.join("\n");

      if (content === lastContentHash) return;

      const metadata = JSON.stringify({
        version: VERSION,
        content,
        entries: deduplicatedEntries.map((entry) => ({
          tagName: entry.tagName,
          componentName: entry.componentName,
          content: formatEntryReference(entry),
        })),
        timestamp: Date.now(),
        implicit: true,
      });

      const didWrite = await writeToClipboard(content, metadata);
      if (didWrite) {
        lastContentHash = content;
      }
    } catch {} finally {
      isWriting = false;
    }
  };

  const scheduleWrite = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      void performWrite();
    }, VIEWPORT_CLIPBOARD_DEBOUNCE_MS);
  };

  const cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return { scheduleWrite, cancel };
};
