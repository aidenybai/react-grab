"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

interface TabsProps extends ComponentProps<typeof TabsPrimitive.Root> {}

export const Tabs = ({ className, ...props }: TabsProps): ReactElement => (
  <TabsPrimitive.Root className={cn("flex flex-col gap-4", className)} {...props} />
);

Tabs.displayName = "Tabs";

interface TabsListProps extends ComponentProps<typeof TabsPrimitive.List> {}

export const TabsList = ({
  className,
  ...props
}: TabsListProps): ReactElement => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 p-1",
      className,
    )}
    {...props}
  />
);

TabsList.displayName = "TabsList";

interface TabsTriggerProps extends ComponentProps<typeof TabsPrimitive.Trigger> {}

export const TabsTrigger = ({
  className,
  ...props
}: TabsTriggerProps): ReactElement => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white/65 transition-colors data-[state=active]:bg-black/70 data-[state=active]:text-white hover:text-white disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      className,
    )}
    {...props}
  />
);

TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends ComponentProps<typeof TabsPrimitive.Content> {}

export const TabsContent = ({
  className,
  ...props
}: TabsContentProps): ReactElement => (
  <TabsPrimitive.Content
    className={cn(
      "outline-none focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      className,
    )}
    {...props}
  />
);

TabsContent.displayName = "TabsContent";
