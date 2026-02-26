"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

interface DropdownMenuSubTriggerProps
  extends ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> {
  inset?: boolean;
}

export const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps): ReactElement => (
  <DropdownMenuPrimitive.SubTrigger
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-white outline-none focus:bg-white/10 data-[state=open]:bg-white/10",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </DropdownMenuPrimitive.SubTrigger>
);

DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

interface DropdownMenuSubContentProps
  extends ComponentProps<typeof DropdownMenuPrimitive.SubContent> {}

export const DropdownMenuSubContent = ({
  className,
  ...props
}: DropdownMenuSubContentProps): ReactElement => (
  <DropdownMenuPrimitive.SubContent
    className={cn(
      "z-50 min-w-32 overflow-hidden rounded-md border border-white/10 bg-[#0d0d0d] p-1 text-white shadow-lg",
      className,
    )}
    {...props}
  />
);

DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

interface DropdownMenuContentProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Content> {}

export const DropdownMenuContent = ({
  className,
  sideOffset = 4,
  ...props
}: DropdownMenuContentProps): ReactElement => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-40 overflow-hidden rounded-md border border-white/10 bg-[#0d0d0d] p-1 text-white shadow-lg",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);

DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Item> {
  inset?: boolean;
}

export const DropdownMenuItem = ({
  className,
  inset,
  ...props
}: DropdownMenuItemProps): ReactElement => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-white/70 outline-none transition-colors focus:bg-white/10 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
);

DropdownMenuItem.displayName = "DropdownMenuItem";

interface DropdownMenuCheckboxItemProps
  extends ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> {}

export const DropdownMenuCheckboxItem = ({
  className,
  children,
  checked,
  ...props
}: DropdownMenuCheckboxItemProps): ReactElement => (
  <DropdownMenuPrimitive.CheckboxItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-white/70 outline-none transition-colors focus:bg-white/10 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
);

DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

interface DropdownMenuLabelProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
}

export const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: DropdownMenuLabelProps): ReactElement => (
  <DropdownMenuPrimitive.Label
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
);

DropdownMenuLabel.displayName = "DropdownMenuLabel";

interface DropdownMenuSeparatorProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Separator> {}

export const DropdownMenuSeparator = ({
  className,
  ...props
}: DropdownMenuSeparatorProps): ReactElement => (
  <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-white/10", className)} {...props} />
);

DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

interface DropdownMenuShortcutProps extends ComponentProps<"span"> {}

export const DropdownMenuShortcut = ({
  className,
  ...props
}: DropdownMenuShortcutProps): ReactElement => (
  <span className={cn("ml-auto text-xs tracking-widest text-white/45", className)} {...props} />
);

DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
