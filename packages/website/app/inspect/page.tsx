"use client";

import { useState, useEffect, useCallback } from "react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { cn } from "@/utils/cn";
import { highlightCode } from "@/lib/shiki";
import { Clipboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import prettyMs from "pretty-ms";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

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

interface HighlightedEntry {
  entry: ReactGrabEntry;
  highlightedHtml: string;
}

const InspectPage = () => {
  const [pastedContent, setPastedContent] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReactGrabMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("formatted");
  const [highlightedEntries, setHighlightedEntries] = useState<
    HighlightedEntry[]
  >([]);
  const [highlightedRawContent, setHighlightedRawContent] = useState<
    string | null
  >(null);
  const isMac = useIsMac();

  const handleClear = useCallback(() => {
    setPastedContent(null);
    setMetadata(null);
    setHighlightedEntries([]);
    setHighlightedRawContent(null);
    setActiveTab("formatted");
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

      setPastedContent(plainText || parsedMetadata?.content || "");
      setMetadata(parsedMetadata);
      setActiveTab("formatted");
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    if (!metadata?.entries.length && !pastedContent) {
      setHighlightedEntries([]);
      setHighlightedRawContent(null);
      return;
    }

    const highlightAsync = async () => {
      if (metadata?.entries.length) {
        const results = await Promise.all(
          metadata.entries.map(async (entry) => {
            const html = await highlightCode({
              code: entry.content,
              lang: "html",
            });
            return { entry, highlightedHtml: html };
          }),
        );
        setHighlightedEntries(results);
      } else if (pastedContent) {
        const html = await highlightCode({
          code: pastedContent,
          lang: "html",
        });
        setHighlightedRawContent(html);
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link href="/" className="shrink-0">
          <ReactGrabLogo width={32} height={32} />
        </Link>

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

        <div className="flex-1" />

        {metadata && (
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          aria-label="Clear"
        >
          <X size={16} />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        {activeTab === "raw" && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground/90">
              {pastedContent}
            </pre>
          </div>
        )}

        {activeTab === "formatted" && (
          <div className="flex flex-col gap-4">
            {highlightedEntries.length > 0
              ? highlightedEntries.map((highlightedEntry, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-lg border border-border bg-card shadow-lg"
                  >
                    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                      {highlightedEntry.entry.tagName && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/70">
                          &lt;{highlightedEntry.entry.tagName}&gt;
                        </span>
                      )}
                      {highlightedEntry.entry.componentName && (
                        <span className="rounded bg-[#fc4efd]/10 px-1.5 py-0.5 font-mono text-xs text-[#fc4efd]">
                          {highlightedEntry.entry.componentName}
                        </span>
                      )}
                    </div>

                    {highlightedEntry.entry.commentText && (
                      <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground italic">
                        {highlightedEntry.entry.commentText}
                      </div>
                    )}

                    <div
                      className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightedEntry.highlightedHtml,
                      }}
                    />
                  </div>
                ))
              : highlightedRawContent && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div
                      className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightedRawContent,
                      }}
                    />
                  </div>
                )}

            {!highlightedEntries.length && !highlightedRawContent && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Highlighting…
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

InspectPage.displayName = "InspectPage";

export default InspectPage;
