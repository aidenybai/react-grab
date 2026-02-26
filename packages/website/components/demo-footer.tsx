"use client";

import { type ReactElement } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DemoFooter = (): ReactElement => {
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
      <Button
        type="button"
        onClick={handleRestartClick}
        variant="link"
        size="sm"
        className="hidden h-auto items-center gap-1 px-0 py-0 text-sm text-white/60 hover:text-white/80 sm:inline-flex sm:text-base"
      >
        <span>restart demo</span>
        <RotateCcw size={13} className="align-middle" />
      </Button>
      <span className="hidden sm:inline"> &middot; </span>
      <Button asChild variant="link" size="sm" className="h-auto px-0 py-0 text-sm text-white/60 hover:text-white/80 sm:text-base">
        <Link href="/blog">blog</Link>
      </Button>{" "}
      &middot;{" "}
      <Button asChild variant="link" size="sm" className="h-auto px-0 py-0 text-sm text-white/60 hover:text-white/80 sm:text-base">
        <Link href="/changelog">changelog</Link>
      </Button>
    </div>
  );
};

DemoFooter.displayName = "DemoFooter";
