"use client";

import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  centered?: boolean;
  padding?: boolean;
  as?: "div" | "main" | "section" | "article";
}

const maxWidthMap = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  full: "100%",
};

export function Container({
  children,
  maxWidth = "lg",
  centered = true,
  padding = true,
  as: Component = "div",
}: ContainerProps) {
  return (
    <Component
      style={{
        maxWidth: maxWidthMap[maxWidth],
        marginLeft: centered ? "auto" : undefined,
        marginRight: centered ? "auto" : undefined,
        paddingLeft: padding ? 16 : undefined,
        paddingRight: padding ? 16 : undefined,
        width: "100%",
      }}
    >
      {children}
    </Component>
  );
}
