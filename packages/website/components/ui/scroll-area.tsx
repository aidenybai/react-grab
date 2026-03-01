"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "@/utils/cn";

export const ScrollArea = ({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>): ReactElement => {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="size-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
};

export const ScrollBar = ({
  className,
  orientation = "vertical",
  ...props
}: ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>): ReactElement => {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2 border-l border-l-transparent",
        orientation === "horizontal" && "h-2 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-[#3a3a3a] hover:bg-[#4a4a4a]"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
};

ScrollArea.displayName = "ScrollArea";
ScrollBar.displayName = "ScrollBar";
