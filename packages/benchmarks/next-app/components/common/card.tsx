"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  bordered?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function Card({
  children,
  className,
  hoverable = false,
  bordered = true,
  padding = "md",
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-lg bg-white ${bordered ? "border border-gray-200" : ""} ${
        hoverable
          ? "cursor-pointer transition-shadow hover:shadow-lg"
          : "shadow-sm"
      } ${paddingMap[padding]} ${className ?? ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mb-4 ${className ?? ""}`}>{children}</div>;
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className ?? ""}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-1 text-sm text-gray-500 ${className ?? ""}`}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-4 flex items-center justify-end gap-2 border-t pt-4 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export default Card;
