"use client";

import React from "react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const sizeClasses = {
      xs: "h-6 w-6 text-xs",
      sm: "h-8 w-8 text-sm",
      md: "h-10 w-10 text-base",
      lg: "h-12 w-12 text-lg",
      xl: "h-16 w-16 text-xl",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || ""}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <span className="font-medium text-muted-foreground">
            {fallback || alt?.charAt(0)?.toUpperCase() || "?"}
          </span>
        )}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";
