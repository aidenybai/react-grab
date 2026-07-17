import { getElementReferenceContext, getStack, getStackContext, resolveSource } from "./context.js";
import { copyContent } from "../utils/copy-content.js";
import { normalizeError } from "../utils/normalize-error.js";
import { getTagName } from "../utils/get-tag-name.js";
import { ABORTED_PROMISE_RESULT, racePromiseWithAbort } from "../utils/race-promise-with-abort.js";
import type { StackFrame } from "bippy/source";
import type { ReactGrabEntry, ReactGrabStackFrame } from "../types.js";

interface CopyFlowOptions {
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
  maxContextLines?: number;
  signal?: AbortSignal;
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

export interface CopyFlowResult {
  readonly status: "cancelled" | "failed" | "succeeded";
}

const CANCELLED_COPY_FLOW_RESULT: CopyFlowResult = {
  status: "cancelled",
};

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
): Promise<CopyFlowResult> => {
  if (options.signal?.aborted) return CANCELLED_COPY_FLOW_RESULT;
  const beforeCopyResult = await racePromiseWithAbort(hooks.onBeforeCopy(elements), options.signal);
  if (beforeCopyResult === ABORTED_PROMISE_RESULT) return CANCELLED_COPY_FLOW_RESULT;

  let didCopy = false;
  let didStartClipboardWrite = false;
  let finalContent = "";

  try {
    const pendingPayload: Promise<CopyPayload | null> = options.getContent
      ? Promise.resolve(options.getContent(elements)).then((content) => ({ content }))
      : buildClipboardPayload(elements, options.maxContextLines);
    const payload = await racePromiseWithAbort(pendingPayload, options.signal);
    if (payload === ABORTED_PROMISE_RESULT) return CANCELLED_COPY_FLOW_RESULT;
    const rawContent = payload?.content;

    if (rawContent?.trim()) {
      const transformedContent = await racePromiseWithAbort(
        hooks.transformCopyContent(rawContent, elements),
        options.signal,
      );
      if (transformedContent === ABORTED_PROMISE_RESULT) {
        return CANCELLED_COPY_FLOW_RESULT;
      }
      finalContent = prependedPrompt
        ? `${prependedPrompt}\n${transformedContent}`
        : transformedContent;
      if (finalContent.trim()) {
        didStartClipboardWrite = true;
        didCopy = copyContent(finalContent, {
          componentName: options.componentName,
          entries: getMetadataEntries(payload, finalContent, prependedPrompt),
        });
      }
    }
  } catch (error) {
    if (!didStartClipboardWrite && options.signal?.aborted) return CANCELLED_COPY_FLOW_RESULT;
    hooks.onCopyError(normalizeError(error));
  }

  if (!didStartClipboardWrite && options.signal?.aborted) return CANCELLED_COPY_FLOW_RESULT;
  if (didCopy) hooks.onCopySuccess(elements, finalContent);
  hooks.onAfterCopy(elements, didCopy);

  return { status: didCopy ? "succeeded" : "failed" };
};
