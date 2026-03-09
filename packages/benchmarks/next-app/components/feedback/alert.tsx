"use client";

import React, { useState } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const variantClasses: Record<
  AlertVariant,
  { container: string; title: string; text: string }
> = {
  info: {
    container: "bg-blue-50 border-blue-200",
    title: "text-blue-800",
    text: "text-blue-700",
  },
  success: {
    container: "bg-green-50 border-green-200",
    title: "text-green-800",
    text: "text-green-700",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    title: "text-amber-800",
    text: "text-amber-700",
  },
  error: {
    container: "bg-red-50 border-red-200",
    title: "text-red-800",
    text: "text-red-700",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const classes = variantClasses[variant];

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`rounded-lg border p-4 ${classes.container}`} role="alert">
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div className="flex-1">
          {title && (
            <h4 className={`text-sm font-semibold ${classes.title}`}>
              {title}
            </h4>
          )}
          <div className={`text-sm ${classes.text} ${title ? "mt-1" : ""}`}>
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ${classes.text} hover:opacity-70`}
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
}
