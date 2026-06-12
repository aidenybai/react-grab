import { getElementReferenceContext, getStack, getStackContext, resolveSource } from "./context.js";
import { copyContent } from "../utils/copy-content.js";
import { normalizeError } from "../utils/normalize-error.js";
import { getTagName } from "../utils/get-tag-name.js";
import type { StackFrame } from "bippy/source";
import type { ReactGrabEntry, ReactGrabStackFrame } from "../types.js";

interface CopyFlowOptions {
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
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

const buildElementPayloadEntry = async (element: Element): Promise<ReactGrabEntry> => {
  const [referenceContext, stackContext, source, stack] = await Promise.all([
    getElementReferenceContext(element),
    getStackContext(element),
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

const buildClipboardPayload = async (elements: Element[]): Promise<CopyPayload | null> => {
  const rawEntries = await Promise.all(elements.map(buildElementPayloadEntry));
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
  if (payload.entries.length !== 1) return undefined;
  return [
    {
      ...payload.entries[0],
      content: finalContent,
      commentText: prependedPrompt,
    },
  ];
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
      : await buildClipboardPayload(elements);
    const rawContent = payload?.content;

    if (rawContent?.trim()) {
      const transformedContent = await hooks.transformCopyContent(rawContent, elements);
      finalContent = prependedPrompt
        ? `${prependedPrompt}\n${transformedContent}`
        : transformedContent;
      didCopy = copyContent(finalContent, {
        componentName: options.componentName,
        entries: getMetadataEntries(payload, finalContent, prependedPrompt),
      });
    }
  } catch (error) {
    hooks.onCopyError(normalizeError(error));
  }

  if (didCopy) hooks.onCopySuccess(elements, finalContent);
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
