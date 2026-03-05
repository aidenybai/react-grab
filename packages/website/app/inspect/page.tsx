"use client";

import { useState, useEffect, useCallback } from "react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { cn } from "@/utils/cn";
import { highlightCode } from "@/lib/shiki";
import { ArrowLeft, Clipboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import prettyMs from "pretty-ms";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";
const STACK_FRAME_PATTERN =
  /^\s+in\s+(\S+?)(?:\s+\(at\s+([^:)]+?)(?::(\d+))?(?::(\d+))?\))?$/;

const TABS = ["raw", "formatted"] as const;
type Tab = (typeof TABS)[number];

interface ReactGrabEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
}

interface ReactGrabMetadata {
  version: string;
  content: string;
  entries: ReactGrabEntry[];
  timestamp: number;
}

interface ParsedStackFrame {
  componentName: string;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

interface ParsedContent {
  htmlSnippet: string;
  stackFrames: ParsedStackFrame[];
}

const parseReactGrabMetadata = (
  jsonString: string,
): ReactGrabMetadata | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (
      parsed &&
      typeof parsed.content === "string" &&
      Array.isArray(parsed.entries)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const parseEntryContent = (content: string): ParsedContent => {
  const lines = content.split("\n");
  const snippetLines: string[] = [];
  const stackFrames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const match = STACK_FRAME_PATTERN.exec(line);
    if (match) {
      stackFrames.push({
        componentName: match[1],
        filePath: match[2] ?? null,
        lineNumber: match[3] ? Number(match[3]) : null,
        columnNumber: match[4] ? Number(match[4]) : null,
      });
    } else {
      snippetLines.push(line);
    }
  }

  return {
    htmlSnippet: snippetLines.join("\n").trimEnd(),
    stackFrames,
  };
};

const formatTimestamp = (timestamp: number): string => {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 1000) return "just now";
  return `${prettyMs(elapsed, { compact: true })} ago`;
};

const useIsMac = (): boolean => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  return isMac;
};

const ElementTag = (props: { children: string }) => (
  <span className="inline-flex items-center rounded-md bg-[#330039] px-1.5 py-0.5 font-mono text-[13px] text-[#ff4fff]">
    {props.children}
  </span>
);

ElementTag.displayName = "ElementTag";

const InfoRow = (props: {
  label: string;
  children: React.ReactNode;
  borderTop?: boolean;
}) => (
  <div
    className={cn(
      "flex items-baseline gap-4 px-4 py-2.5",
      props.borderTop && "border-t border-border",
    )}
  >
    <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {props.label}
    </span>
    <span className="min-w-0 text-sm text-foreground">{props.children}</span>
  </div>
);

InfoRow.displayName = "InfoRow";

interface FormattedEntryCardProps {
  entry: ReactGrabEntry;
  highlightedSnippet: string;
  parsedContent: ParsedContent;
  entryIndex: number;
  totalEntries: number;
}

const FormattedEntryCard = (props: FormattedEntryCardProps) => {
  const hasStack = props.parsedContent.stackFrames.length > 0;
  const firstFrame = hasStack ? props.parsedContent.stackFrames[0] : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {props.totalEntries > 1 && (
        <div className="border-b border-border bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          Entry {props.entryIndex + 1} of {props.totalEntries}
        </div>
      )}

      {props.entry.tagName && (
        <InfoRow label="Element">
          <ElementTag>{`<${props.entry.tagName}>`}</ElementTag>
        </InfoRow>
      )}

      {props.entry.componentName && (
        <InfoRow label="Component" borderTop>
          <span className="font-mono text-[13px]">
            {props.entry.componentName}
          </span>
        </InfoRow>
      )}

      {firstFrame?.filePath && (
        <InfoRow label="File" borderTop>
          <span className="font-mono text-[13px]">
            {firstFrame.filePath}
            {firstFrame.lineNumber !== null && (
              <span className="text-muted-foreground">
                :{firstFrame.lineNumber}
                {firstFrame.columnNumber !== null &&
                  `:${firstFrame.columnNumber}`}
              </span>
            )}
          </span>
        </InfoRow>
      )}

      {props.entry.commentText && (
        <InfoRow label="Comment" borderTop>
          <span className="italic text-muted-foreground">
            &ldquo;{props.entry.commentText}&rdquo;
          </span>
        </InfoRow>
      )}

      {props.parsedContent.htmlSnippet && (
        <div className="border-t border-border">
          <div className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            HTML
          </div>
          <div
            className="overflow-x-auto px-4 pb-3 font-mono text-[13px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: props.highlightedSnippet }}
          />
        </div>
      )}

      {hasStack && (
        <div className="border-t border-border">
          <div className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Stack
          </div>
          <div className="px-4 pb-3">
            {props.parsedContent.stackFrames.map((frame, frameIndex) => (
              <div
                key={frameIndex}
                className="flex items-baseline gap-3 py-0.5 font-mono text-[13px]"
              >
                <span className="shrink-0 text-[#ff4fff]">
                  {frame.componentName}
                </span>
                {frame.filePath && (
                  <span className="truncate text-muted-foreground">
                    {frame.filePath}
                    {frame.lineNumber !== null && `:${frame.lineNumber}`}
                    {frame.columnNumber !== null && `:${frame.columnNumber}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

FormattedEntryCard.displayName = "FormattedEntryCard";

interface HighlightedEntryData {
  entry: ReactGrabEntry;
  parsedContent: ParsedContent;
  highlightedSnippet: string;
}

const InspectPage = () => {
  const [pastedContent, setPastedContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReactGrabMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("raw");
  const [highlightedFullContent, setHighlightedFullContent] = useState<
    string | null
  >(null);
  const [highlightedEntryData, setHighlightedEntryData] = useState<
    HighlightedEntryData[]
  >([]);
  const isMac = useIsMac();

  const handleClear = useCallback(() => {
    setPastedContent(null);
    setMetadata(null);
    setHighlightedFullContent(null);
    setHighlightedEntryData([]);
    setActiveTab("raw");
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const reactGrabData = clipboardData.getData(REACT_GRAB_MIME_TYPE);
      const plainText = clipboardData.getData("text/plain");

      if (!reactGrabData && !plainText) return;

      event.preventDefault();

      const parsedMetadata = reactGrabData
        ? parseReactGrabMetadata(reactGrabData)
        : null;

      const content = plainText || parsedMetadata?.content || "";
      setPastedContent(content);
      setMetadata(parsedMetadata);
      setActiveTab(parsedMetadata ? "formatted" : "raw");
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    if (!pastedContent) {
      setHighlightedFullContent(null);
      setHighlightedEntryData([]);
      return;
    }

    const highlightAsync = async () => {
      const fullHtml = await highlightCode({
        code: pastedContent,
        lang: "html",
      });
      setHighlightedFullContent(fullHtml);

      if (metadata?.entries.length) {
        const results = await Promise.all(
          metadata.entries.map(async (entry) => {
            const parsedContent = parseEntryContent(entry.content);
            const highlightedSnippet = parsedContent.htmlSnippet
              ? await highlightCode({
                  code: parsedContent.htmlSnippet,
                  lang: "html",
                })
              : "";
            return { entry, parsedContent, highlightedSnippet };
          }),
        );
        setHighlightedEntryData(results);
      }
    };

    highlightAsync();
  }, [metadata, pastedContent]);

  const hasContent = Boolean(pastedContent);

  if (!hasContent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-6">
          <Link href="/">
            <ReactGrabLogo
              width={64}
              height={64}
              className="logo-shimmer-once"
            />
          </Link>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Inspect</h1>
            <p className="text-center text-muted-foreground">
              Paste React Grab output anywhere on this page
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-lg">
            <Clipboard size={16} className="opacity-50" />
            <span className="font-mono">
              {isMac ? "⌘" : "Ctrl"}&thinsp;+&thinsp;V
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-4 text-base sm:pt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-2 underline underline-offset-4 opacity-50 hover:opacity-100"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="inline-flex" style={{ padding: "2px" }}>
          <Link href="/" className="transition-opacity hover:opacity-80">
            <ReactGrabLogo
              width={42}
              height={42}
              className="logo-shimmer-once"
            />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {TABS.map((tab) => (
              <Button
                key={tab}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "h-7 px-3 text-xs capitalize",
                  activeTab === tab
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {tab}
              </Button>
            ))}
          </div>

          {metadata && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {metadata.version && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  v{metadata.version}
                </span>
              )}
              {metadata.timestamp > 0 && (
                <span>{formatTimestamp(metadata.timestamp)}</span>
              )}
            </div>
          )}

          <div className="flex-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            aria-label="Clear"
          >
            <X size={16} />
          </Button>
        </div>

        {activeTab === "raw" && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {highlightedFullContent ? (
              <div
                className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedFullContent }}
              />
            ) : (
              <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground/80">
                {pastedContent}
              </pre>
            )}
          </div>
        )}

        {activeTab === "formatted" && (
          <div className="flex flex-col gap-4">
            {highlightedEntryData.length > 0 ? (
              highlightedEntryData.map((entryData, index) => (
                <FormattedEntryCard
                  key={index}
                  entry={entryData.entry}
                  highlightedSnippet={entryData.highlightedSnippet}
                  parsedContent={entryData.parsedContent}
                  entryIndex={index}
                  totalEntries={highlightedEntryData.length}
                />
              ))
            ) : metadata ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading&hellip;
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Paste React Grab output (with{" "}
                  <span className="font-mono text-xs">
                    application/x-react-grab
                  </span>{" "}
                  metadata) for the structured view.
                </div>
                <div className="border-t border-border">
                  <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground/80">
                    {pastedContent}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

InspectPage.displayName = "InspectPage";

export default InspectPage;
