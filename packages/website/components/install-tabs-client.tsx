"use client";

import { useEffect, useState } from "react";
import { highlightCode } from "../lib/shiki";
import { installTabsData } from "./install-tabs";

export const InstallTabsClient = () => {
  const [activeTabId, setActiveTabId] = useState<string>(installTabsData[0]?.id);
  const [didCopy, setDidCopy] = useState(false);
  const [highlightedCodes, setHighlightedCodes] = useState<Record<string, string>>({});

  const activeTab = installTabsData.find((tab) => tab.id === activeTabId) ?? installTabsData[0];

  useEffect(() => {
    Promise.all(
      installTabsData.map(async (tab) => ({
        id: tab.id,
        html: await highlightCode({ code: tab.code, lang: "tsx" }),
      }))
    ).then((results) => {
      const codes: Record<string, string> = {};
      results.forEach((result) => {
        codes[result.id] = result.html;
      });
      setHighlightedCodes(codes);
    });
  }, []);

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

  const highlightedCode = highlightedCodes[activeTab.id];

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-sm text-white">
      <div className="flex items-center gap-4 border-b border-white/10 px-4 pt-2">
        {installTabsData.map((tab) => {
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
          {highlightedCode ? (
            <div
              className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          ) : (
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-white/80">
              <code>{activeTab.code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
