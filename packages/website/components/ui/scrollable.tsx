"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <ScrollArea
        className={cn(
          "overflow-y-auto rounded-md [scrollbar-width:none] [&_[data-slot='scroll-area-scrollbar']]:opacity-0 [&_[data-slot='scroll-area-scrollbar']]:transition-opacity hover:[&_[data-slot='scroll-area-scrollbar']]:opacity-100",
          className,
        )}
        style={{ maxHeight }}
      >
        {children}
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-linear-to-t from-black/50 to-transparent" />
    </div>
  );
};

Scrollable.displayName = "Scrollable";
