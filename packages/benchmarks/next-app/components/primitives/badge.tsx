"use client";

import React from "react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variant === "default" && "bg-primary text-primary-foreground",
          variant === "secondary" && "bg-secondary text-secondary-foreground",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground",
          variant === "outline" && "border text-foreground",
          variant === "success" && "bg-green-100 text-green-800",
          variant === "warning" && "bg-yellow-100 text-yellow-800",
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
