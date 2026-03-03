"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { Copy, Check } from "lucide-react";
import { COPY_FEEDBACK_DURATION_MS } from "@/constants";
import { cn } from "@/utils/cn";
import { detectMobile } from "@/utils/detect-mobile";
import { hotkeyToString } from "@/utils/hotkey-to-string";
import type { RecordedHotkey } from "./grab-element-button";
import { useHotkey } from "./hotkey-context";
import { highlightCode } from "../lib/shiki";

interface InlineCodeProps {
  children: React.ReactNode;
}

const InlineCode = ({ children }: InlineCodeProps): ReactElement => (
  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/70">
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
    description: "Paste this prompt in your coding agent's chat",
    variant: "prompt",
    getCode: (hotkey) => {
      const command = hotkey
        ? `npx -y grab@latest init --key "${hotkeyToString(hotkey)}"`
        : "npx -y grab@latest init";
      return `Find the React project in this workspace (look for package.json with a react dependency). If there are multiple, ask me which one. Then run \`${command}\` in that project's root directory to install React Grab.`;
    },
    getChangedLines: () => [],
  },
  {
    id: "next-app",
    label: "Next.js (App)",
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
    id: "next-pages",
    label: "Next.js (Pages)",
    description: (
      <>
        Add this into your <InlineCode>pages/_document.tsx</InlineCode>
      </>
    ),
    variant: "code",
    getCode: (hotkey) => {
      const dataOptionsAttr = hotkey
        ? `\n            data-options='{"activationKey":"${hotkeyToString(
            hotkey,
          )}"}'`
        : "";
      return `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"${dataOptionsAttr}
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`;
    },
    getChangedLines: (hotkey) =>
      hotkey ? [8, 9, 10, 11, 12, 13, 14, 15] : [8, 9, 10, 11, 12, 13, 14],
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
    id: "webpack",
    label: "Webpack",
    description: (
      <>
        First <InlineCode>npm install react-grab</InlineCode>, then add this at
        the top of your main entry file
      </>
    ),
    variant: "code",
    getCode: (hotkey) => {
      if (hotkey) {
        return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (process.env.NODE_ENV === "development") {
  import("react-grab/core").then(({ init }) => {
    init(${formatInitOptions(hotkey)});
  });
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
      }
      return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    },
    getChangedLines: (hotkey) => (hotkey ? [5, 6, 7, 8, 9] : [5, 6, 7]),
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
  const [highlightedCodes, setHighlightedCodes] = useState<
    Record<string, string>
  >({});
  const [isMobile, setIsMobile] = useState(false);

  const activeTab =
    installTabsData.find((tab) => tab.id === activeTabId) ?? installTabsData[0];
  const activeCode = activeTab.getCode(customHotkey ?? null);
  const activeChangedLines = activeTab.getChangedLines(customHotkey ?? null);

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
        <span className="hidden sm:inline text-white">
          {headingText}
          {activeTab.variant !== "code" && (
            <button
              type="button"
              onClick={() => setActiveTabId("next-app")}
              className="ml-3 text-xs italic text-white/40 hover:text-white/60 hover:underline transition-colors sm:text-sm"
            >
              Prefer manual install?
            </button>
          )}
        </span>
      )}
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        <div className="flex items-center gap-4 overflow-x-auto border-b border-white/10 px-4 pt-2">
          {installTabsData.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "shrink-0 whitespace-nowrap border-b pb-2 font-sans text-sm transition-colors sm:text-base",
                  isActive
                    ? "border-white text-white"
                    : "border-transparent text-white/60 hover:text-white",
                )}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="bg-black/60 relative">
          <div className="relative">
            {activeTab.variant !== "code" ? (
              <button
                type="button"
                onClick={handleCopyClick}
                className="group flex w-full items-center justify-between gap-4 px-4 py-6 transition-colors hover:bg-white/5"
              >
                {activeTab.variant === "prompt" ? (
                  <p className="text-left text-base leading-relaxed text-white/80 text-pretty">
                    {activeCode}
                  </p>
                ) : highlightedCode ? (
                  <div
                    className="overflow-x-auto font-mono text-base leading-relaxed highlighted-code"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                ) : (
                  <pre className="overflow-x-auto font-mono text-base leading-relaxed text-white/80">
                    <code>{activeCode}</code>
                  </pre>
                )}
                <span className="shrink-0 text-white/50 transition-colors group-hover:text-white">
                  {didCopy ? <Check size={16} /> : <Copy size={16} />}
                </span>
              </button>
            ) : (
              <div className="group relative">
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="touch-hitbox absolute! right-4 top-4 text-white/50 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 z-10"
                >
                  {didCopy ? <Check size={16} /> : <Copy size={16} />}
                </button>
                {highlightedCode ? (
                  <div
                    className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed highlighted-code"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                ) : (
                  <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-white/80">
                    <code>{activeCode}</code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {activeTab.variant === "code" && (
        <span className="mt-4 block text-sm text-white/50 sm:text-base">
          {activeTab.description}
        </span>
      )}
      {showAgentNote && activeTab.variant === "code" && (
        <span className="mt-2 block text-sm text-white/50 sm:text-base">
          Want to connect directly to your coding agent?{" "}
          <a href="/blog/agent" className="underline hover:text-white/70">
            See our agent connection guide
          </a>
        </span>
      )}
    </div>
  );
};

InstallTabs.displayName = "InstallTabs";
