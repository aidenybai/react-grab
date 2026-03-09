"use client";

import React from "react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          variant === "default" &&
            "bg-primary text-primary-foreground hover:bg-primary/90",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          variant === "outline" &&
            "border border-input bg-background hover:bg-accent",
          variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
          variant === "link" &&
            "text-primary underline-offset-4 hover:underline",
          size === "sm" && "h-9 px-3 text-sm",
          size === "md" && "h-10 px-4 py-2",
          size === "lg" && "h-11 px-8 text-lg",
          size === "icon" && "h-10 w-10",
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
