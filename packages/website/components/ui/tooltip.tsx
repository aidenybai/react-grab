"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "@/utils/cn";

export const TooltipProvider = ({
  delayDuration = 0,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>): ReactElement => {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
};

export const Tooltip = ({
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>): ReactElement => {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
};

export const TooltipTrigger = ({
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>): ReactElement => {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
};

export const TooltipContent = ({
  className,
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>): ReactElement => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 origin-(--radix-tooltip-content-transform-origin) rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
};

TooltipProvider.displayName = "TooltipProvider";
Tooltip.displayName = "Tooltip";
TooltipTrigger.displayName = "TooltipTrigger";
TooltipContent.displayName = "TooltipContent";
