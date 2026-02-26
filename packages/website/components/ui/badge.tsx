"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/15 bg-white/5 text-white/85",
        secondary: "border-[#ff4fff]/30 bg-[#330039] text-[#ff4fff]",
        success: "border-emerald-300/25 bg-emerald-500/10 text-emerald-300",
        danger: "border-red-300/25 bg-red-500/10 text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({
  className,
  variant,
  ...props
}: BadgeProps): ReactElement => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

Badge.displayName = "Badge";
