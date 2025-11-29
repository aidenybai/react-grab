"use client";

import { useEffect, useState, useCallback } from "react";
import { highlightCode } from "../lib/shiki";
import { detectMobile } from "@/utils/detect-mobile";
import { cn } from "@/utils/classnames";
import { useHotkey } from "./hotkey-context";
import type { RecordedHotkey } from "./grab-element-button";

interface InstallTab {
  id: string;
  label: string;
  fileName: string;
  description: string;
  getCode: (hotkey: RecordedHotkey | null) => string;
  getChangedLines: (hotkey: RecordedHotkey | null) => number[];
}

const formatDataOptions = (hotkey: RecordedHotkey): string => {
  const activationKey = {
    ...(hotkey.key && { key: hotkey.key.toLowerCase() }),
    ...(hotkey.metaKey && { metaKey: true }),
    ...(hotkey.ctrlKey && { ctrlKey: true }),
    ...(hotkey.shiftKey && { shiftKey: true }),
    ...(hotkey.altKey && { altKey: true }),
  };
  return JSON.stringify({ activationKey });
};

const formatDataOptionsForNextjs = (hotkey: RecordedHotkey): string => {
  const parts: string[] = [];
  if (hotkey.key) parts.push(`key: "${hotkey.key.toLowerCase()}"`);
  if (hotkey.metaKey) parts.push("metaKey: true");
  if (hotkey.ctrlKey) parts.push("ctrlKey: true");
  if (hotkey.shiftKey) parts.push("shiftKey: true");
  if (hotkey.altKey) parts.push("altKey: true");
  return `{ activationKey: { ${parts.join(", ")} } }`;
};

const installTabsData: InstallTab[] = [
  {
    id: "next-app",
    label: "Next.js (App)",
    fileName: "app/layout.tsx",
    description: "Add this inside of your app/layout.tsx:",
    getCode: (hotkey) => {
      const dataOptionsAttr = hotkey
        ? `\n            data-options={JSON.stringify(\n              ${formatDataOptionsForNextjs(hotkey)}\n            )}`
        : "";
      return `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* put this in the <head> */}
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
      hotkey ? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] : [8, 9, 10, 11, 12, 13, 14],
  },
  {
    id: "next-pages",
    label: "Next.js (Pages)",
    fileName: "pages/_document.tsx",
    description: "Add this into your pages/_document.tsx:",
    getCode: (hotkey) => {
      const dataOptionsAttr = hotkey
        ? `\n            data-options={JSON.stringify(\n              ${formatDataOptionsForNextjs(hotkey)}\n            )}`
        : "";
      return `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* put this in the <Head> */}
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
      hotkey ? [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] : [9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: "vite",
    label: "Vite",
    fileName: "index.html",
    description: "Example index.html with React Grab enabled in development:",
    getCode: (hotkey) => {
      if (hotkey) {
        const optionsArg = formatDataOptions(hotkey);
        return `<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i react-grab
      // then in head:
      if (import.meta.env.DEV) {
        const { init } = await import("react-grab/core");
        init(${optionsArg});
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
    fileName: "src/index.tsx",
    description: "First npm install react-grab, then add this at the top of your main entry file:",
    getCode: (hotkey) => {
      if (hotkey) {
        const optionsArg = formatDataOptions(hotkey);
        return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (process.env.NODE_ENV === "development") {
  import("react-grab/core").then(({ init }) => {
    init(${optionsArg});
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
    getChangedLines: (hotkey) =>
      hotkey ? [5, 6, 7, 8, 9] : [5, 6, 7],
  },
];

export const InstallTabs = () => {
  const { customHotkey } = useHotkey();
  const [activeTabId, setActiveTabId] = useState<string>(installTabsData[0]?.id);
  const [didCopy, setDidCopy] = useState(false);
  const [highlightedCodes, setHighlightedCodes] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  const activeTab = installTabsData.find((tab) => tab.id === activeTabId) ?? installTabsData[0];
  const activeCode = activeTab.getCode(customHotkey ?? null);
  const activeChangedLines = activeTab.getChangedLines(customHotkey ?? null);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  const updateHighlightedCodes = useCallback(async (hotkey: RecordedHotkey | null) => {
    const results = await Promise.all(
      installTabsData.map(async (tab) => ({
        id: tab.id,
        html: await highlightCode({
          code: tab.getCode(hotkey),
          lang: "tsx",
          changedLines: tab.getChangedLines(hotkey),
        }),
      }))
    );
    const codes: Record<string, string> = {};
    results.forEach((result) => {
      codes[result.id] = result.html;
    });
    setHighlightedCodes(codes);
  }, []);

  useEffect(() => {
    updateHighlightedCodes(customHotkey ?? null);
  }, [customHotkey, updateHighlightedCodes]);

  const handleCopyClick = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    const textToCopy = activeChangedLines
      ? activeCode
          .split("\n")
          .filter((_, index) => activeChangedLines.includes(index + 1))
          .join("\n")
      : activeCode;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setDidCopy(true);
        setTimeout(() => setDidCopy(false), 1200);
      })
      .catch(() => {});
  };

  const highlightedCode = highlightedCodes[activeTab.id];

  if (isMobile) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-sm text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className="flex items-center gap-4 border-b border-white/10 px-4 pt-2">
        {installTabsData.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "border-b pb-2 font-sans text-[13px] transition-colors",
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white"
              )}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-black/60 relative">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 px-4 py-2 text-[11px] text-white/60">
          <span>{activeTab.description}</span>
          <span className="font-mono text-[11px] text-white/40">{activeTab.fileName}</span>
        </div>
        <div className="relative">
          <div className="group relative">
            <button
              type="button"
              onClick={handleCopyClick}
              className="absolute right-4 top-3 text-[11px] text-white/50 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 z-10"
            >
              {didCopy ? "Copied" : "Copy"}
            </button>
            {highlightedCode ? (
              <div
                className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed highlighted-code"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            ) : (
              <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-white/80">
                <code>{activeCode}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
