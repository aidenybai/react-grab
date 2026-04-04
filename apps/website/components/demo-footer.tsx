"use client";

import { type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export const DemoFooter = (): ReactElement => {
  const handleRestartClick = (): void => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
    } catch {
      return;
    }
    window.location.reload();
  };

  return (
    <div className="pt-4 text-sm text-muted-foreground sm:text-base">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={handleRestartClick}
        className="hidden h-auto items-center gap-1 p-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground sm:inline-flex sm:text-base"
      >
        <span className="underline underline-offset-4">restart demo</span>
        <RotateCcw size={13} className="align-middle" />
      </Button>
      <span className="hidden sm:inline"> &middot; </span>
      <a href="/changelog" className="underline underline-offset-4 hover:text-foreground">
        changelog
      </a>
    </div>
  );
};

DemoFooter.displayName = "DemoFooter";
