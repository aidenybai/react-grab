"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { cn } from "@/utils/classnames";
import { IconCursor } from "@/components/icon-cursor";
import { IconVSCode, IconZed, IconWebStorm } from "@/components/icons";
import { ChevronDown, ChevronRight } from "lucide-react";
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

const getEditorUrl = (editor: Editor, filePath: string, lineNumber?: number): string => {
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
    parseAsStringLiteral(EDITOR_OPTIONS)
  );

  const resolvedFilePath = filePath ?? filePathAlt ?? "";

  const [preferredEditor, setPreferredEditor] = useState<Editor>("cursor");
  const [didAttemptOpen, setDidAttemptOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasSavedPreference, setHasSavedPreference] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && EDITORS.some((editor) => editor.id === saved)) {
      setPreferredEditor(saved as Editor);
      setHasSavedPreference(true);
    }
  }, []);

  useEffect(() => {
    if (editorParam && EDITORS.some((editor) => editor.id === editorParam)) {
      setPreferredEditor(editorParam);
    }
  }, [editorParam]);

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
      lineNumber ? parseInt(lineNumber, 10) : undefined
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
      <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-4 text-base sm:pt-8 sm:text-lg">
          <Link href="/" className="inline-flex" style={{ padding: "2px", transform: "translateX(-3px)" }}>
            <ReactGrabLogo width={42} height={42} />
          </Link>
          <div className="text-white">
            No file specified. Add{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">?url=path/to/file</code>{" "}
            to the URL.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-4 text-base sm:pt-8 sm:text-lg">
        <Link href="/" className="inline-flex" style={{ padding: "2px", transform: "translateX(-3px)" }}>
          <ReactGrabLogo width={42} height={42} className="logo-shimmer-once" />
        </Link>

        <div className="text-white">
          Opening{" "}
          <span className="inline-flex items-center rounded-md bg-[#330039] px-1 py-0.5 text-xs font-mono text-[#ff4fff]">
            {fileName}
          </span>
          {lineNumber && (
            <>
              {" "}at line{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">{lineNumber}</code>
            </>
          )}
        </div>

        <div className="text-white/50 font-mono text-sm break-all">
          {resolvedFilePath}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              <span className="opacity-80">{selectedEditor?.icon}</span>
              <span>{selectedEditor?.name}</span>
              <ChevronDown size={14} className={cn("opacity-50 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-white/20 bg-[#0a0a0a] shadow-lg">
                {EDITORS.map((editor) => (
                  <button
                    key={editor.id}
                    type="button"
                    onClick={() => handleEditorChange(editor.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                      preferredEditor === editor.id
                        ? "bg-[#330039] text-[#ff4fff]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="opacity-80">{editor.icon}</span>
                    <span>{editor.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d75fcb] bg-[#330039] px-4 text-sm text-white transition-colors hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open
          </button>
        </div>

        <div className="text-white/40 text-xs pt-2 space-y-1">
          <p>Your preference will be saved for future use.</p>
          <p>Only open files from sources you trust.</p>
        </div>

        <div className="mt-6 pt-4">
          <button
            type="button"
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className="flex items-center gap-1 text-white/30 text-xs hover:text-white/50 transition-colors outline-none"
          >
            <ChevronRight size={12} className={cn("transition-transform", isInfoOpen && "rotate-90")} />
            What is React Grab?
          </button>

          {isInfoOpen && (
            <div className="mt-2 text-white/40 text-xs space-y-1.5 pl-4">
              <p>
                Select any element in your React app and copy its context to AI tools.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-white/50 hover:text-white/70 text-xs"
              >
                Learn more →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OpenFilePage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-4 sm:pt-8">
            <ReactGrabLogo width={42} height={42} className="animate-pulse" />
          </div>
        </div>
      }
    >
      <OpenFileContent />
    </Suspense>
  );
};

OpenFilePage.displayName = "OpenFilePage";

export default OpenFilePage;
