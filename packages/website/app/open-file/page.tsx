"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { cn } from "@/utils/classnames";
import { IconCursor } from "@/components/icon-cursor";
import { IconVSCode, IconZed, IconWebStorm } from "@/components/icons";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const EDITOR_OPTIONS = ["cursor", "vscode", "zed", "webstorm"] as const;
type Editor = (typeof EDITOR_OPTIONS)[number];

interface EditorOption {
  id: Editor;
  name: string;
  icon: React.ReactNode;
}

const EDITORS: EditorOption[] = [
  { id: "cursor", name: "Cursor", icon: <IconCursor width={16} height={16} /> },
  { id: "vscode", name: "VS Code", icon: <IconVSCode /> },
  { id: "zed", name: "Zed", icon: <IconZed /> },
  { id: "webstorm", name: "WebStorm", icon: <IconWebStorm /> },
];

const STORAGE_KEY = "react-grab-preferred-editor";

const getEditorUrl = (
  editor: Editor,
  filePath: string,
  lineNumber?: number,
): string => {
  if (editor === "webstorm") {
    const lineParam = lineNumber ? `&line=${lineNumber}` : "";
    return `webstorm://open?file=${filePath}${lineParam}`;
  }

  const lineParam = lineNumber ? `:${lineNumber}` : "";
  return `${editor}://file/${filePath}${lineParam}`;
};

const OpenFileContent = () => {
  const [filePath] = useQueryState("url");
  const [filePathAlt] = useQueryState("file");
  const [lineNumber] = useQueryState("line");
  const [editorParam, setEditorParam] = useQueryState(
    "editor",
    parseAsStringLiteral(EDITOR_OPTIONS),
  );

  const resolvedFilePath = filePath ?? filePathAlt ?? "";

  const getInitialEditor = (): { editor: Editor; hasSaved: boolean } => {
    if (typeof window === "undefined")
      return { editor: "cursor", hasSaved: false };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && EDITORS.some((e) => e.id === saved)) {
      return { editor: saved as Editor, hasSaved: true };
    }
    return { editor: "cursor", hasSaved: false };
  };

  const [preferredEditor, setPreferredEditor] = useState<Editor>(() => {
    if (editorParam && EDITORS.some((e) => e.id === editorParam))
      return editorParam;
    return getInitialEditor().editor;
  });
  const [didAttemptOpen, setDidAttemptOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasSavedPreference] = useState(() => getInitialEditor().hasSaved);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

    setTimeout(() => {
      window.close();
    }, 300);
  }, [resolvedFilePath, preferredEditor, lineNumber]);

  useEffect(() => {
    if (resolvedFilePath && !didAttemptOpen && hasSavedPreference) {
      const timer = setTimeout(() => {
        handleOpen();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [resolvedFilePath, didAttemptOpen, handleOpen, hasSavedPreference]);

  const handleEditorChange = (editor: Editor) => {
    setPreferredEditor(editor);
    localStorage.setItem(STORAGE_KEY, editor);
    setEditorParam(editor);
    setIsDropdownOpen(false);
  };

  const fileName = resolvedFilePath.split("/").pop() ?? "file";
  const selectedEditor = EDITORS.find((e) => e.id === preferredEditor);

  if (!resolvedFilePath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0d0d0d] p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
          <div className="mb-6 flex justify-center">
            <ReactGrabLogo width={100} height={40} />
          </div>
          <div className="text-white/60 text-sm">
            No file specified. Add{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
              ?url=path/to/file
            </code>{" "}
            to the URL.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="mb-8">
        <Link href="/">
          <ReactGrabLogo
            width={160}
            height={60}
            className="logo-shimmer-once"
          />
        </Link>
      </div>

      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#0d0d0d] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-lg text-white/80">
          <span>Opening</span>
          <span className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/90">
            {fileName}
          </span>
          {lineNumber && (
            <>
              <span>at line</span>
              <span className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/90">
                {lineNumber}
              </span>
            </>
          )}
        </div>

        <div className="mb-6 font-mono text-sm text-white/40 break-all">
          {resolvedFilePath}
        </div>

        <div className="mb-6 inline-flex items-stretch rounded-lg border border-white/10 bg-white/5">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-full items-center gap-2 rounded-l-lg px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              <span className="opacity-70">{selectedEditor?.icon}</span>
              <span>{selectedEditor?.name}</span>
              <ChevronDown
                size={14}
                className={cn(
                  "opacity-40 transition-transform",
                  isDropdownOpen && "rotate-180",
                )}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-[#0d0d0d] shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                {EDITORS.map((editor) => (
                  <button
                    key={editor.id}
                    type="button"
                    onClick={() => handleEditorChange(editor.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      preferredEditor === editor.id
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white/90",
                    )}
                  >
                    <span className="opacity-70">{editor.icon}</span>
                    <span>{editor.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px bg-white/10" />

          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 rounded-r-lg px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            <span>Open</span>
            <ArrowUpRight size={14} className="opacity-50" />
          </button>
        </div>

        <div className="space-y-1 text-xs text-white/40">
          <p>Your preference will be saved for future use.</p>
          <p>Only open files from trusted sources.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsInfoOpen(!isInfoOpen)}
        className="mt-8 flex items-center gap-1.5 text-xs text-white/25 transition-colors hover:text-white/40 focus:outline-none"
      >
        <span>What is React Grab?</span>
        <ChevronDown
          size={10}
          className={cn("transition-transform", isInfoOpen && "rotate-180")}
        />
      </button>

      {isInfoOpen && (
        <p className="mt-2 text-center text-xs text-white/30">
          Select any element in your React app and copy its context to AI tools.{" "}
          <Link href="/" className="underline hover:text-white/50">
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
        <div className="flex min-h-screen items-center justify-center bg-black p-4">
          <ReactGrabLogo width={160} height={60} className="animate-pulse" />
        </div>
      }
    >
      <OpenFileContent />
    </Suspense>
  );
};

OpenFilePage.displayName = "OpenFilePage";

export default OpenFilePage;
