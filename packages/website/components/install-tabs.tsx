"use client";

import { useMemo, useState } from "react";
import { highlight } from "sugar-high";

interface InstallTab {
  id: string;
  label: string;
  fileName: string;
  description: string;
  code: string;
}

const installTabs: InstallTab[] = [
  {
    id: "next-app",
    label: "Next.js (App)",
    fileName: "app/layout.tsx",
    description: "Add this inside of your app/layout.tsx:",
    code: `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* put this in the <head> */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </head>
      <body>{children}</body>
    </html>
  );
}`,
  },
  {
    id: "next-pages",
    label: "Next.js (Pages)",
    fileName: "pages/_document.tsx",
    description: "Add this into your pages/_document.tsx:",
    code: `import { Html, Head, Main, NextScript } from "next/document";
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
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`,
  },
  {
    id: "vite",
    label: "Vite",
    fileName: "index.html",
    description: "Example index.html with React Grab enabled in development:",
    code: `<!doctype html>
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
</html>`,
  },
];

export const InstallTabs = () => {
  const [activeTabId, setActiveTabId] = useState<string>(installTabs[0]?.id);
  const [didCopy, setDidCopy] = useState(false);

  const activeTab = installTabs.find((tab) => tab.id === activeTabId) ?? installTabs[0];

  const highlightedCode = useMemo(
    () => highlight(activeTab.code),
    [activeTab.code]
  );

  const handleCopyClick = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    navigator.clipboard
      .writeText(activeTab.code)
      .then(() => {
        setDidCopy(true);
        setTimeout(() => {
          setDidCopy(false);
        }, 1200);
      })
      .catch(() => {});
  };

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-sm text-white">
      <div className="flex items-center gap-4 border-b border-white/10 px-4 pt-2">
        {installTabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`border-b pb-2 font-sans text-[13px] transition-colors ${
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-black/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] text-white/60">
          <span>{activeTab.description}</span>
          <span className="font-mono text-[11px] text-white/40">{activeTab.fileName}</span>
        </div>
        <div className="group relative">
          <button
            type="button"
            onClick={handleCopyClick}
            className="absolute right-4 top-3 text-[11px] text-white/50 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          >
            {didCopy ? "Copied" : "Copy"}
          </button>
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-[#f5f5f5]">
            <code
              className="sh__code"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
};
