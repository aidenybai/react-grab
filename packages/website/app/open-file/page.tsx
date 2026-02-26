"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useState, useEffect, useCallback, Suspense } from "react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { cn } from "@/utils/cn";
import { IconCursor } from "@/components/icons/icon-cursor";
import { IconVSCode } from "@/components/icons/icon-vscode";
import { IconZed } from "@/components/icons/icon-zed";
import { IconWebStorm } from "@/components/icons/icon-webstorm";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

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

const isEditorOption = (value: string): value is Editor =>
  EDITORS.some((editorOption) => editorOption.id === value);

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
  const [rawParam] = useQueryState("raw");

  const resolvedFilePath = filePath ?? filePathAlt ?? "";

  const getInitialEditor = (): { editor: Editor; hasSaved: boolean } => {
    if (typeof window === "undefined")
      return { editor: "cursor", hasSaved: false };
    const params = new URLSearchParams(window.location.search);
    if (params.has("raw")) return { editor: "cursor", hasSaved: false };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isEditorOption(saved)) {
      return { editor: saved, hasSaved: true };
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
  const selectedEditor = EDITORS.find((e) => e.id === preferredEditor);

  if (!resolvedFilePath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md p-8 text-center">
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
        </Card>
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

      <Card className="w-full max-w-lg p-8">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-lg text-white/80">
          <span>Opening</span>
          <Badge variant="default" className="rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/90">
            {fileName}
          </Badge>
          {lineNumber && (
            <>
              <span>at line</span>
              <Badge variant="default" className="rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/90">
                {lineNumber}
              </Badge>
            </>
          )}
        </div>

        <div className="mb-6 font-mono text-sm text-white/40 break-all">
          {resolvedFilePath}
        </div>

        <div className="mb-6 inline-flex items-stretch rounded-lg border border-white/10 bg-white/5">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-full rounded-r-none px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
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
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-[160px] border-white/10 bg-[#0d0d0d]"
            >
              {EDITORS.map((editor) => (
                <DropdownMenuItem
                  key={editor.id}
                  onSelect={() => handleEditorChange(editor.id)}
                  className={cn(
                    preferredEditor === editor.id
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90",
                  )}
                >
                  <span className="opacity-70">{editor.icon}</span>
                  <span>{editor.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="bg-white/10" />

          <Button
            type="button"
            variant="ghost"
            onClick={handleOpen}
            className="h-full rounded-l-none px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
          >
            <span>Open</span>
            <ArrowUpRight size={14} className="opacity-50" />
          </Button>
        </div>

        <div className="space-y-1 text-xs text-white/40">
          <p>Your preference will be saved for future use.</p>
          <p>Only open files from trusted sources.</p>
        </div>
      </Card>

      <Button
        type="button"
        onClick={() => setIsInfoOpen(!isInfoOpen)}
        variant="ghost"
        size="sm"
        className="mt-8 h-auto gap-1.5 px-0 py-0 text-xs text-white/25 hover:bg-transparent hover:text-white/40"
      >
        <span>What is React Grab?</span>
        <ChevronDown
          size={10}
          className={cn("transition-transform", isInfoOpen && "rotate-180")}
        />
      </Button>

      {isInfoOpen && (
        <p className="mt-2 text-center text-xs text-white/30">
          Select any element in your React app and copy its context to AI tools.{" "}
          <Link href="/" className="rounded-sm underline hover:text-white/50 focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
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
