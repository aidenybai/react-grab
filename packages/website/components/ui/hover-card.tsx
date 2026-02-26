"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

export const HoverCard = HoverCardPrimitive.Root;
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

interface HoverCardContentProps
  extends ComponentProps<typeof HoverCardPrimitive.Content> {}

export const HoverCardContent = ({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: HoverCardContentProps): ReactElement => (
  <HoverCardPrimitive.Content
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 rounded-md border border-white/10 bg-[#0d0d0d] p-2 text-white shadow-lg outline-none",
      className,
    )}
    {...props}
  />
);

HoverCardContent.displayName = "HoverCardContent";
