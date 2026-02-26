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
        variant="link"
        size="sm"
        onClick={handleRestartClick}
        className="hidden h-auto items-center gap-1 px-0 py-0 text-sm text-white/50 hover:text-white/80 sm:inline-flex sm:text-base"
      >
        <span className="underline underline-offset-4">restart demo</span>
        <RotateCcw size={13} className="align-middle" />
      </Button>
      <span className="hidden sm:inline"> &middot; </span>
      <Link href="/blog" className="underline underline-offset-4 hover:text-white/80">
        blog
      </Link>{" "}
      &middot;{" "}
      <Link href="/changelog" className="underline underline-offset-4 hover:text-white/80">
        changelog
      </Link>
    </div>
  );
};

DemoFooter.displayName = "DemoFooter";
