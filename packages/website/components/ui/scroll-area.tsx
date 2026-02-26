"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

interface ScrollAreaProps extends ComponentProps<typeof ScrollAreaPrimitive.Root> {
  className?: string;
}

export const ScrollArea = ({
  className,
  children,
  ...props
}: ScrollAreaProps): ReactElement => (
  <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
);

ScrollArea.displayName = "ScrollArea";

interface ScrollBarProps
  extends ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  className?: string;
}

export const ScrollBar = ({ className, orientation = "vertical", ...props }: ScrollBarProps): ReactElement => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    orientation={orientation}
    className={cn(
      "flex touch-none select-none p-px transition-colors",
      orientation === "vertical" ? "h-full w-2.5 border-l border-l-transparent" : "h-2.5 flex-col border-t border-t-transparent",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/20 hover:bg-white/30" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
);

ScrollBar.displayName = "ScrollBar";
