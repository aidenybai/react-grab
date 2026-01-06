"use client";

import { RotateCcw } from "lucide-react";

export const DemoFooter = () => {
  const handleRestartClick = () => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
    } catch {
      return;
    }
    window.location.reload();
  };

  return (
    <div className="pt-4 text-sm text-white/50 sm:text-base">
      <button
        type="button"
        onClick={handleRestartClick}
        className="hidden items-center gap-1 hover:text-white/80 sm:inline-flex"
      >
        <span className="underline underline-offset-4">restart demo</span>
        <RotateCcw size={13} className="align-middle" />
      </button>
      <span className="hidden sm:inline"> &middot; </span>
      <a
        href="/blog"
        className="underline underline-offset-4 hover:text-white/80"
      >
        blog
      </a>{" "}
      &middot;{" "}
      <a
        href="/changelog"
        className="underline underline-offset-4 hover:text-white/80"
      >
        changelog
      </a>
    </div>
  );
};

DemoFooter.displayName = "DemoFooter";
