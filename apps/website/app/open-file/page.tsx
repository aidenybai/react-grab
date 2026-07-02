"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useState, useEffect, useCallback, Suspense, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { IconCursor } from "@/components/icons/icon-cursor";
import { IconVSCode } from "@/components/icons/icon-vscode";
import { IconZed } from "@/components/icons/icon-zed";
import { IconWebStorm } from "@/components/icons/icon-webstorm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EDITOR_OPTIONS = ["cursor", "vscode", "zed", "webstorm"] as const;
type Editor = (typeof EDITOR_OPTIONS)[number];

interface EditorOption {
  id: Editor;
  name: string;
  icon: ReactNode;
}

const EDITORS: EditorOption[] = [
  { id: "cursor", name: "Cursor", icon: <IconCursor width={16} height={16} /> },
  { id: "vscode", name: "VS Code", icon: <IconVSCode /> },
  { id: "zed", name: "Zed", icon: <IconZed /> },
  { id: "webstorm", name: "WebStorm", icon: <IconWebStorm /> },
];

const STORAGE_KEY = "react-grab-preferred-editor";

const getEditorUrl = (editor: Editor, filePath: string, lineNumber?: number): string => {
  // The query param arrives decoded, so a raw `&`, `#`, or `?` in the path
  // would be parsed as URL structure by the editor and truncate the file path.
  // Re-encode everything except `/` (path separators stay literal).
  const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
  if (editor === "webstorm") {
    const lineParam = lineNumber ? `&line=${lineNumber}` : "";
    return `webstorm://open?file=${encodedPath}${lineParam}`;
  }

  const lineParam = lineNumber ? `:${lineNumber}` : "";
  return `${editor}://file/${encodedPath}${lineParam}`;
};

const Wordmark = () => (
  <Link
    href="/"
    className="font-sans text-h3 font-medium text-title transition-colors hover:text-ink"
  >
    React Grab
  </Link>
);

const OpenFileContent = () => {
  const [filePath] = useQueryState("url");
  const [filePathAlt] = useQueryState("file");
  const [lineNumber] = useQueryState("line");
  const [editorParam, setEditorParam] = useQueryState(
    "editor",
    parseAsStringLiteral(EDITOR_OPTIONS),
  );
  const [rawParam] = useQueryState("raw");

  const resolvedFilePath = filePath ?? filePathAlt ?? "";

  const getInitialEditor = (): { editor: Editor; hasSaved: boolean } => {
    if (typeof window === "undefined") return { editor: "cursor", hasSaved: false };
    const params = new URLSearchParams(window.location.search);
    if (params.has("raw")) return { editor: "cursor", hasSaved: false };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && EDITORS.some((editor) => editor.id === saved)) {
      return { editor: saved as Editor, hasSaved: true };
    }
    return { editor: "cursor", hasSaved: false };
  };

  const [preferredEditor, setPreferredEditor] = useState<Editor>(() => {
    if (editorParam && EDITORS.some((editor) => editor.id === editorParam)) return editorParam;
    return getInitialEditor().editor;
  });
  const [didAttemptOpen, setDidAttemptOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasSavedPreference] = useState(() => getInitialEditor().hasSaved);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = useCallback(() => {
    if (!resolvedFilePath) return;

    const url = getEditorUrl(
      preferredEditor,
      resolvedFilePath,
      lineNumber ? parseInt(lineNumber, 10) : undefined,
    );
    window.location.href = url;
    setDidAttemptOpen(true);
  }, [resolvedFilePath, preferredEditor, lineNumber]);

  useEffect(() => {
    if (resolvedFilePath && !didAttemptOpen && hasSavedPreference) {
      const timer = setTimeout(() => {
        handleOpen();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [resolvedFilePath, didAttemptOpen, handleOpen, hasSavedPreference]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !isDropdownOpen) {
        handleOpen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleOpen, isDropdownOpen]);

  const handleEditorChange = (editor: Editor) => {
    setPreferredEditor(editor);
    if (!rawParam) {
      localStorage.setItem(STORAGE_KEY, editor);
    }
    setEditorParam(editor);
    setIsDropdownOpen(false);
  };

  const fileName = resolvedFilePath.split("/").pop() ?? "file";
  const selectedEditor = EDITORS.find((editor) => editor.id === preferredEditor);

  if (!resolvedFilePath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-line bg-card p-8 text-center">
          <div className="mb-6 flex justify-center">
            <Wordmark />
          </div>
          <div className="text-sm text-prose">
            No file specified. Add{" "}
            <code className="rounded bg-code px-1.5 py-0.5 font-mono text-xs text-code-ink">
              ?url=path/to/file
            </code>{" "}
            to the URL.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Wordmark />
      </div>

      <div className="w-full max-w-lg rounded-lg border border-line bg-card p-8">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-lg text-label">
          <span>Opening</span>
          <span className="inline-flex items-center rounded bg-code px-2 py-0.5 font-mono text-sm text-code-ink">
            {fileName}
          </span>
          {lineNumber && (
            <>
              <span>at line</span>
              <span className="inline-flex items-center rounded bg-code px-2 py-0.5 font-mono text-sm text-code-ink">
                {lineNumber}
              </span>
            </>
          )}
        </div>

        <div className="mb-6 break-all font-mono text-sm text-prose">{resolvedFilePath}</div>

        <div className="mb-6 inline-flex items-stretch rounded-lg border border-line bg-canvas">
          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              className="h-auto rounded-l-lg rounded-r-none px-4 py-2.5 text-label hover:text-ink aria-expanded:text-ink"
            >
              <span className="opacity-70">{selectedEditor?.icon}</span>
              <span>{selectedEditor?.name}</span>
              <ChevronDown
                size={14}
                className={cn("opacity-40 transition-transform", isDropdownOpen && "rotate-180")}
              />
            </Button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-line bg-card shadow-lg">
                {EDITORS.map((editor) => (
                  <Button
                    key={editor.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleEditorChange(editor.id)}
                    className={cn(
                      "h-auto w-full justify-start gap-2.5 rounded-none px-4 py-2.5",
                      preferredEditor === editor.id
                        ? "bg-muted text-ink"
                        : "text-prose hover:bg-muted hover:text-label",
                    )}
                  >
                    <span className="opacity-70">{editor.icon}</span>
                    <span>{editor.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px bg-line" />

          <Button
            type="button"
            variant="ghost"
            onClick={handleOpen}
            className="h-auto rounded-l-none rounded-r-lg px-4 py-2.5 text-label hover:text-ink"
          >
            <span>Open</span>
            <ArrowUpRight size={14} className="opacity-50" />
          </Button>
        </div>

        <div className="space-y-1 text-xs text-faint">
          <p>Your preference will be saved for future use.</p>
          <p>Only open files from trusted sources.</p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsInfoOpen(!isInfoOpen)}
        className="mt-8 gap-1.5 text-faint hover:text-prose"
      >
        <span>What is React Grab?</span>
        <ChevronDown size={10} className={cn("transition-transform", isInfoOpen && "rotate-180")} />
      </Button>

      {isInfoOpen && (
        <p className="mt-2 max-w-sm text-center text-xs text-faint">
          Select any element in your React app and copy its context to AI tools.{" "}
          <Link href="/" className="underline hover:text-prose">
            Learn more
          </Link>
        </p>
      )}
    </div>
  );
};

const OpenFilePage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <span className="animate-pulse font-sans text-h3 font-medium text-title">React Grab</span>
        </div>
      }
    >
      <OpenFileContent />
    </Suspense>
  );
};

OpenFilePage.displayName = "OpenFilePage";

export default OpenFilePage;
