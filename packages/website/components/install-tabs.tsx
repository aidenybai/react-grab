"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { Copy, Check, Terminal, ChevronDown } from "lucide-react";
import {
  COPY_FEEDBACK_DURATION_MS,
  PROMPT_INSTALL_COLLAPSE_LINE_THRESHOLD,
  PROMPT_INSTALL_MAX_HEIGHT_PX,
} from "@/constants";
import { cn } from "@/utils/cn";
import { IconNextjs } from "./icons/icon-nextjs";
import { IconVite } from "./icons/icon-vite";
import { IconTanstack } from "./icons/icon-tanstack";
import { detectMobile } from "@/utils/detect-mobile";
import { hotkeyToString } from "@/utils/hotkey-to-string";
import type { RecordedHotkey } from "./grab-element-button";
import { useHotkey } from "./hotkey-context";
import { highlightCode } from "../lib/shiki";

interface InlineCodeProps {
  children: React.ReactNode;
}

const InlineCode = ({ children }: InlineCodeProps): ReactElement => (
  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
    {children}
  </code>
);

InlineCode.displayName = "InlineCode";

interface InstallTab {
  id: string;
  label: string;
  description: React.ReactNode;
  variant: "code" | "command" | "prompt";
  lang?: "tsx" | "bash";
  getCode: (hotkey: RecordedHotkey | null) => string;
  getChangedLines: (hotkey: RecordedHotkey | null) => number[];
}

const formatInitOptions = (hotkey: RecordedHotkey): string => {
  return `{ activationKey: "${hotkeyToString(hotkey)}" }`;
};

const createPromptInstallInstructions = (
  hotkey: RecordedHotkey | null,
): string => {
  const activationKeyInstruction = hotkey
    ? `Set the activation key to "${hotkeyToString(hotkey)}". For Next.js Script tags, set data-options='{"activationKey":"${hotkeyToString(
        hotkey,
      )}"}'. For Vite & TanStack Start, use react-grab/core and call init(${formatInitOptions(
        hotkey,
      )}).`
    : "Keep the default activation key.";

  return `Set up React Grab in this workspace. If this is a monorepo, ask me which package to install it in.

1. Find the React app package in this workspace.
2. If this is a monorepo, ask me which package to configure before making changes.
3. Detect the package manager from lockfiles and install react-grab@latest in the selected package.
4. Detect the framework and apply manual integration:
- Next.js App Router: in app/layout.tsx, add next/script and include a development-only Script tag with src="//unpkg.com/react-grab/dist/index.global.js", crossOrigin="anonymous", and strategy="beforeInteractive".
- Next.js Pages Router: in pages/_document.tsx, add the same development-only Script tag inside <Head>.
- Vite: in index.html <head>, add <script type="module">if (import.meta.env.DEV) { import("react-grab"); }</script>.
- TanStack Start: in src/routes/__root.tsx, inside useEffect and an import.meta.env.DEV check, run void import("react-grab").
5. ${activationKeyInstruction}
6. Keep all React Grab setup development-only.
7. Show me the edited files and the exact install command you ran.
8. If the setup does not work, suggest running the React Grab CLI:
\`npx -y grab@latest init\`.`;
};

const installTabsData: InstallTab[] = [
  {
    id: "cli",
    label: "CLI",
    description: "Run this command at your project root",
    variant: "command",
    lang: "bash",
    getCode: (hotkey) => {
      if (hotkey) {
        return `npx -y grab@latest init --key "${hotkeyToString(hotkey)}"`;
      }
      return `npx -y grab@latest init`;
    },
    getChangedLines: () => [],
  },
  {
    id: "prompt",
    label: "Prompt",
    description: "Paste this full setup prompt in your coding agent's chat",
    variant: "prompt",
    getCode: (hotkey) => createPromptInstallInstructions(hotkey),
    getChangedLines: () => [],
  },
  {
    id: "next-app",
    label: "Next.js",
    description: (
      <>
        Add this inside of your <InlineCode>app/layout.tsx</InlineCode>
      </>
    ),
    variant: "code",
    getCode: (hotkey) => {
      const dataOptionsAttr = hotkey
        ? `\n            data-options='{"activationKey":"${hotkeyToString(
            hotkey,
          )}"}'`
        : "";
      return `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"${dataOptionsAttr}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}`;
    },
    getChangedLines: (hotkey) =>
      hotkey ? [7, 8, 9, 10, 11, 12, 13, 14] : [7, 8, 9, 10, 11, 12, 13],
  },
  {
    id: "vite",
    label: "Vite",
    description: (
      <>
        Example <InlineCode>index.html</InlineCode> with React Grab enabled in
        development
      </>
    ),
    variant: "code",
    getCode: (hotkey) => {
      if (hotkey) {
        return `<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i react-grab
      // then in head:
      if (import.meta.env.DEV) {
        const { init } = await import("react-grab/core");
        init(${formatInitOptions(hotkey)});
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      }
      return `<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i react-grab
      // then in head:
      if (import.meta.env.DEV) {
        import("react-grab");
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    },
    getChangedLines: (hotkey) =>
      hotkey ? [4, 5, 6, 7, 8, 9, 10, 11] : [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: "tanstack",
    label: "TanStack Start",
    description: (
      <>
        Add this inside your <InlineCode>src/routes/__root.tsx</InlineCode>
      </>
    ),
    variant: "code",
    getCode: (hotkey) => {
      if (hotkey) {
        return `import { useEffect } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      import("react-grab/core").then(({ init }) => {
        init(${formatInitOptions(hotkey)});
      });
    }
  }, []);

  return <Outlet />;
}`;
      }
      return `import { useEffect } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);

  return <Outlet />;
}`;
    },
    getChangedLines: (hotkey) =>
      hotkey ? [9, 10, 11, 12, 13, 14, 15] : [9, 10, 11, 12, 13],
  },
];

const HEADING_TEXT_BY_VARIANT: Record<InstallTab["variant"], string> = {
  prompt: "Copy this to your agent:",
  command: "Run this command to get started:",
  code: "It takes 1 script tag to get started:",
};

interface InstallTabsProps {
  showHeading?: boolean;
  showAgentNote?: boolean;
}

export const InstallTabs = ({
  showHeading = false,
  showAgentNote = false,
}: InstallTabsProps): ReactElement | null => {
  const { customHotkey } = useHotkey();
  const [activeTabId, setActiveTabId] = useState<string>(
    installTabsData[0]?.id,
  );
  const [didCopy, setDidCopy] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [highlightedCodes, setHighlightedCodes] = useState<
    Record<string, string>
  >({});
  const [isMobile, setIsMobile] = useState(false);

  const activeTab =
    installTabsData.find((tab) => tab.id === activeTabId) ?? installTabsData[0];
  const activeCode = activeTab.getCode(customHotkey ?? null);
  const activeChangedLines = activeTab.getChangedLines(customHotkey ?? null);
  const isPromptTab = activeTab.variant === "prompt";
  const shouldShowPromptExpandButton =
    isPromptTab &&
    activeCode.split("\n").length > PROMPT_INSTALL_COLLAPSE_LINE_THRESHOLD;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(detectMobile());
  }, []);

  const updateHighlightedCodes = useCallback(
    async (hotkey: RecordedHotkey | null) => {
      const results = await Promise.all(
        installTabsData.map(async (tab) => ({
          id: tab.id,
          html:
            tab.variant === "prompt"
              ? ""
              : await highlightCode({
                  code: tab.getCode(hotkey),
                  lang: tab.lang ?? "tsx",
                  changedLines: tab.getChangedLines(hotkey),
                }),
        })),
      );
      const codes: Record<string, string> = {};
      results.forEach((result) => {
        codes[result.id] = result.html;
      });
      setHighlightedCodes(codes);
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHighlightedCodes(customHotkey ?? null);
  }, [customHotkey, updateHighlightedCodes]);

  useEffect(() => {
    setIsPromptExpanded(false);
  }, [activeTab.id, activeCode]);

  const handleCopyClick = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    const textToCopy =
      activeChangedLines.length > 0
        ? activeCode
            .split("\n")
            .filter((_, index) => activeChangedLines.includes(index + 1))
            .join("\n")
        : activeCode;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setDidCopy(true);
        setTimeout(() => setDidCopy(false), COPY_FEEDBACK_DURATION_MS);
      })
      .catch(() => {});
  };

  const highlightedCode = highlightedCodes[activeTab.id];

  if (isMobile) {
    return null;
  }

  const headingText = HEADING_TEXT_BY_VARIANT[activeTab.variant];

  return (
    <div>
      {showHeading && (
        <span className="hidden sm:inline text-foreground">
          {headingText}
          {activeTab.variant !== "code" && (
            <button
              type="button"
              onClick={() => setActiveTabId("next-app")}
              className="ml-3 text-xs italic text-muted-foreground hover:text-foreground/60 hover:underline transition-colors sm:text-sm"
            >
              Prefer manual install?
            </button>
          )}
        </span>
      )}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-lg">
        <div className="flex items-center gap-4 overflow-x-auto border-b border-border px-4 pt-2">
          {installTabsData.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "group/tab shrink-0 whitespace-nowrap border-b pb-2 font-sans text-sm transition-colors sm:text-base",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.id === "cli" && <Terminal size={14} />}
                  {tab.id === "next-app" && (
                    <IconNextjs
                      className={
                        isActive
                          ? "grayscale-0 opacity-100"
                          : "group-hover/tab:grayscale-0 group-hover/tab:opacity-100 transition-all"
                      }
                    />
                  )}
                  {tab.id === "vite" && (
                    <IconVite
                      className={
                        isActive
                          ? "grayscale-0 opacity-100"
                          : "group-hover/tab:grayscale-0 group-hover/tab:opacity-100 transition-all"
                      }
                    />
                  )}
                  {tab.id === "tanstack" && (
                    <IconTanstack
                      className={
                        isActive
                          ? "grayscale-0 opacity-100"
                          : "group-hover/tab:grayscale-0 group-hover/tab:opacity-100 transition-all"
                      }
                    />
                  )}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="bg-background/60 relative">
          <div className="relative">
            {activeTab.variant !== "code" ? (
              activeTab.variant === "prompt" ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleCopyClick}
                    className="touch-hitbox absolute! right-4 top-4 text-muted-foreground transition-colors hover:text-foreground z-10"
                  >
                    {didCopy ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <div
                    className="overflow-hidden px-4 py-6 transition-[max-height] duration-200 ease-out"
                    style={
                      !isPromptExpanded && shouldShowPromptExpandButton
                        ? { maxHeight: `${PROMPT_INSTALL_MAX_HEIGHT_PX}px` }
                        : undefined
                    }
                  >
                    <p className="text-left text-base leading-relaxed text-foreground/80 whitespace-pre-wrap pr-10 pb-10">
                      {activeCode}
                    </p>
                  </div>
                  {shouldShowPromptExpandButton && !isPromptExpanded && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-card via-card/95 to-transparent" />
                  )}
                  {shouldShowPromptExpandButton && (
                    <button
                      type="button"
                      onClick={() => setIsPromptExpanded((previous) => !previous)}
                      className="absolute bottom-3 right-4 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-card/90 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>
                        {isPromptExpanded ? "Show less" : "Show full prompt"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "transition-transform",
                          isPromptExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="group flex w-full items-center justify-between gap-4 px-4 py-6 transition-colors hover:bg-muted/50"
                >
                  {highlightedCode ? (
                  <div
                    className="overflow-x-auto font-mono text-base leading-relaxed highlighted-code"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                ) : (
                  <pre className="overflow-x-auto font-mono text-base leading-relaxed text-foreground/80">
                    <code>{activeCode}</code>
                  </pre>
                )}
                <span className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                  {didCopy ? <Check size={16} /> : <Copy size={16} />}
                </span>
                </button>
              )
            ) : (
              <div className="group relative">
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="touch-hitbox absolute! right-4 top-4 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 z-10"
                >
                  {didCopy ? <Check size={16} /> : <Copy size={16} />}
                </button>
                {highlightedCode ? (
                  <div
                    className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed highlighted-code"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                ) : (
                  <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground/80">
                    <code>{activeCode}</code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {activeTab.variant === "code" && (
        <span className="mt-4 block text-sm text-muted-foreground sm:text-base">
          {activeTab.description}
        </span>
      )}
      {showAgentNote && activeTab.variant === "code" && (
        <span className="mt-2 block text-sm text-muted-foreground sm:text-base">
          Want to connect directly to your coding agent?{" "}
          <a href="/blog/agent" className="underline hover:text-foreground/70">
            See our agent connection guide
          </a>
        </span>
      )}
    </div>
  );
};

InstallTabs.displayName = "InstallTabs";
