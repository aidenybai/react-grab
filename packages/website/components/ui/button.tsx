"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/50",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring",
        ghost:
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-ring",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps): ReactElement => {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

Button.displayName = "Button";

export { buttonVariants };
