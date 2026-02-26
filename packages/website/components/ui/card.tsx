"use client";

import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/utils/cn";

export const Card = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border border-border shadow-sm",
        className,
      )}
      {...props}
    />
  );
};

export const CardHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
};

export const CardTitle = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): ReactElement => {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactElement => {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};

export const CardContent = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => {
  return (
    <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  );
};

export const CardFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
};

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardDescription.displayName = "CardDescription";
CardContent.displayName = "CardContent";
CardFooter.displayName = "CardFooter";
