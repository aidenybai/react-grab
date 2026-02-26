"use client";

import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

interface CardProps extends ComponentProps<"div"> {}

export const Card = ({ className, ...props }: CardProps): ReactElement => (
  <div
    className={cn(
      "rounded-lg border border-white/10 bg-[#0d0d0d] text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
      className,
    )}
    {...props}
  />
);

Card.displayName = "Card";

interface CardHeaderProps extends ComponentProps<"div"> {}

export const CardHeader = ({
  className,
  ...props
}: CardHeaderProps): ReactElement => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends ComponentProps<"h3"> {}

export const CardTitle = ({
  className,
  ...props
}: CardTitleProps): ReactElement => (
  <h3 className={cn("text-lg font-semibold", className)} {...props} />
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends ComponentProps<"p"> {}

export const CardDescription = ({
  className,
  ...props
}: CardDescriptionProps): ReactElement => (
  <p className={cn("text-sm text-white/55", className)} {...props} />
);

CardDescription.displayName = "CardDescription";

interface CardContentProps extends ComponentProps<"div"> {}

export const CardContent = ({
  className,
  ...props
}: CardContentProps): ReactElement => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends ComponentProps<"div"> {}

export const CardFooter = ({
  className,
  ...props
}: CardFooterProps): ReactElement => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);

CardFooter.displayName = "CardFooter";
