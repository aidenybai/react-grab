import { getElementReferenceContext, getStack, getStackContext, resolveSource } from "./context.js";
import { buildAgentNoteLines } from "../utils/build-agent-note-lines.js";
import { copyContent } from "../utils/copy-content.js";
import { copyContentWithScreenshot } from "../utils/copy-content-with-screenshot.js";
import { renderAnnotatedScreenshot } from "../utils/render-annotated-screenshot.js";
import { normalizeError } from "../utils/normalize-error.js";
import { getTagName } from "../utils/get-tag-name.js";
import type { StackFrame } from "bippy/source";
import type { ReactGrabEntry, ReactGrabStackFrame } from "../types.js";

interface CopyFlowOptions {
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
  maxContextLines?: number;
  screenshot?: boolean;
}

interface CopyFlowHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  transformCopyContent: (content: string, elements: Element[]) => Promise<string>;
  onAfterCopy: (elements: Element[], didCopy: boolean) => void;
  onCopySuccess: (elements: Element[], content: string) => void;
  onCopyError: (error: Error) => void;
}

interface CopyPayload {
  content: string;
  entries?: ReactGrabEntry[];
}

// Strips bippy's raw `source` stack-line text and `args` from the wire payload.
const formatStackFramePayload = (frame: StackFrame): ReactGrabStackFrame => ({
  functionName: frame.functionName,
  fileName: frame.fileName,
  lineNumber: frame.lineNumber,
  columnNumber: frame.columnNumber,
  isServer: frame.isServer,
  isSymbolicated: frame.isSymbolicated,
});

const buildElementPayloadEntry = async (
  element: Element,
  maxContextLines?: number,
): Promise<ReactGrabEntry> => {
  const stackOptions = { maxLines: maxContextLines };
  const [referenceContext, stackContext, source, stack] = await Promise.all([
    getElementReferenceContext(element, stackOptions),
    getStackContext(element, stackOptions),
    resolveSource(element),
    getStack(element),
  ]);
  return {
    tagName: getTagName(element),
    componentName: source?.componentName ?? undefined,
    content: `[${referenceContext}]`,
    source,
    stackContext,
    frames: (stack ?? []).map(formatStackFramePayload),
  };
};

const buildClipboardPayload = async (
  elements: Element[],
  maxContextLines?: number,
): Promise<CopyPayload | null> => {
  const rawEntries = await Promise.all(
    elements.map((element) => buildElementPayloadEntry(element, maxContextLines)),
  );
  const entriesByContent = new Map<string, ReactGrabEntry>();
  for (const entry of rawEntries) {
    if (!entriesByContent.has(entry.content)) {
      entriesByContent.set(entry.content, entry);
    }
  }
  const entries = [...entriesByContent.values()];
  return entries.length > 0
    ? { content: entries.map((entry) => entry.content).join("\n"), entries }
    : null;
};

const getMetadataEntries = (
  payload: CopyPayload | null,
  finalContent: string,
  prependedPrompt: string | undefined,
): ReactGrabEntry[] | undefined => {
  if (!payload?.entries) return undefined;
  if (finalContent === payload.content) return payload.entries;
  if (payload.entries.length === 1) {
    return [
      {
        ...payload.entries[0],
        content: finalContent,
        commentText: prependedPrompt,
      },
    ];
  }
  // Transformed multi-element content no longer maps 1:1 onto entries, so keep
  // each entry's own reference content and only attach the prompt.
  return payload.entries.map((entry) => ({ ...entry, commentText: prependedPrompt }));
};

export const runCopyFlow = async (
  options: CopyFlowOptions,
  hooks: CopyFlowHooks,
  elements: Element[],
  prependedPrompt?: string,
): Promise<boolean> => {
  await hooks.onBeforeCopy(elements);

  let didCopy = false;
  let finalContent = "";

  try {
    const payload: CopyPayload | null = options.getContent
      ? { content: await options.getContent(elements) }
      : await buildClipboardPayload(elements, options.maxContextLines);
    const rawContent = payload?.content;

    if (rawContent?.trim()) {
      const transformedContent = await hooks.transformCopyContent(rawContent, elements);
      finalContent = prependedPrompt
        ? `${prependedPrompt}\n${transformedContent}`
        : transformedContent;
      const entries = getMetadataEntries(payload, finalContent, prependedPrompt);
      if (options.screenshot !== false) {
        didCopy = await copyContentWithScreenshot(finalContent, entries ?? [], () =>
          renderAnnotatedScreenshot(elements, buildAgentNoteLines(entries ?? [])),
        );
      }
      if (!didCopy) {
        didCopy = copyContent(finalContent, {
          componentName: options.componentName,
          entries,
        });
      }
    }
  } catch (error) {
    hooks.onCopyError(normalizeError(error));
  }

  if (didCopy) hooks.onCopySuccess(elements, finalContent);
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
