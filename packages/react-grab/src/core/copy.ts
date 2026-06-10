import { getElementReferenceContext, getStack, resolveSource } from "./context.js";
import { copyContent } from "../utils/copy-content.js";
import { normalizeError } from "../utils/normalize-error.js";
import { getTagName } from "../utils/get-tag-name.js";
import type { StackFrame } from "bippy/source";

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

interface CopyPayloadEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
  source?: {
    filePath: string;
    lineNumber: number | null;
    columnNumber: number | null;
    componentName: string | null;
  } | null;
  stackContext?: string;
  frames?: Array<{
    functionName?: string;
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
    isServer?: boolean;
    isSymbolicated?: boolean;
  }>;
}

interface CopyPayload {
  content: string;
  entries?: CopyPayloadEntry[];
}

const formatStackFramePayload = (
  frame: StackFrame,
): NonNullable<CopyPayloadEntry["frames"]>[number] => ({
  functionName: frame.functionName,
  fileName: frame.fileName,
  lineNumber: frame.lineNumber,
  columnNumber: frame.columnNumber,
  isServer: frame.isServer,
  isSymbolicated: frame.isSymbolicated,
});

const buildElementPayloadEntry = async (element: Element): Promise<CopyPayloadEntry> => {
  const [referenceContext, source, stack] = await Promise.all([
    getElementReferenceContext(element),
    resolveSource(element),
    getStack(element),
  ]);
  const inlineReference = `[${referenceContext}]`;
  return {
    tagName: getTagName(element),
    componentName: source?.componentName ?? undefined,
    content: inlineReference,
    source,
    stackContext: referenceContext,
    frames: (stack ?? []).map(formatStackFramePayload),
  };
};

const buildClipboardPayload = async (elements: Element[]): Promise<CopyPayload | null> => {
  const rawEntries = await Promise.all(elements.map(buildElementPayloadEntry));
  const entriesByContent = new Map<string, CopyPayloadEntry>();
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
  rawContent: string,
  finalContent: string,
  prependedPrompt: string | undefined,
): CopyPayloadEntry[] | undefined => {
  if (!payload?.entries) return undefined;
  if (finalContent === rawContent) return payload.entries;
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
    const payload = options.getContent
      ? { content: await options.getContent(elements), entries: undefined }
      : await buildClipboardPayload(elements);
    const rawContent = payload?.content;

    if (rawContent?.trim()) {
      const transformedContent = await hooks.transformCopyContent(rawContent, elements);
      finalContent = prependedPrompt
        ? `${prependedPrompt}\n${transformedContent}`
        : transformedContent;
      didCopy = copyContent(finalContent, {
        componentName: options.componentName,
        entries: getMetadataEntries(payload, rawContent, finalContent, prependedPrompt),
      });
    }
  } catch (error) {
    hooks.onCopyError(normalizeError(error));
  }

  if (didCopy) hooks.onCopySuccess(elements, finalContent);
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
