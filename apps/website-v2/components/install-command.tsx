"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const COMMAND = "npx grab@latest init";

export const InstallCommand = () => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative flex w-full cursor-text items-center justify-between gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-1.5 font-mono text-sm">
        <span className="shrink-0 select-none text-muted-foreground">$</span>
        <div className="relative min-w-0">
          <div className="scrollbar-none overflow-x-auto pr-6 whitespace-nowrap text-foreground">
            {COMMAND}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-card to-transparent" />
        </div>
      </div>
      <button
        type="button"
        aria-label="Copy install command"
        onClick={copy}
        className="-m-2 shrink-0 p-2 text-muted-foreground transition-opacity hover:opacity-70"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
};
