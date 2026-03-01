"use client";

import type { ReactElement, ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/cn";

interface ScrollableProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export const Scrollable = ({
  children,
  className = "",
  maxHeight = "200px",
}: ScrollableProps): ReactElement => {
  return (
    <div className="relative">
      <ScrollArea className={cn("pr-2", className)} style={{ maxHeight }}>
        {children}
      </ScrollArea>
      <div className="pointer-events-none absolute bottom-0 left-0 right-2 h-8 bg-linear-to-t from-black/50 to-transparent" />
    </div>
  );
};

Scrollable.displayName = "Scrollable";
