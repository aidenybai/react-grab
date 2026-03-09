"use client";
import React from "react";

const variants = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
  secondary:
    "bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline:
    "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]",
};

export function TwButton({
  children,
  variant = "primary",
  onClick,
  className,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${variants[variant]} ${className || ""}`}
    >
      {children}
    </button>
  );
}
