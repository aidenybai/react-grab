"use client";

import React, { useState, useRef, useCallback } from "react";

interface OverlayTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  maxWidth?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  maxWidth = 200,
  disabled = false,
}: OverlayTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay, disabled]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
    },
    bottom: {
      top: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
    },
    left: {
      right: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)",
    },
    right: {
      left: "calc(100% + 6px)",
      top: "50%",
      transform: "translateY(-50%)",
    },
  };

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 9999,
            maxWidth,
            padding: "6px 10px",
            backgroundColor: "#1F2937",
            color: "#F9FAFB",
            fontSize: 12,
            lineHeight: 1.4,
            borderRadius: 6,
            whiteSpace: "normal",
            wordWrap: "break-word",
            pointerEvents: "none",
            boxShadow: "0 4px 6px rgba(0,0,0,0.15)",
            ...positionStyles[position],
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
