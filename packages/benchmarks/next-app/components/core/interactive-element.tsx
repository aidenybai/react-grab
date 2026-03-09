"use client";

import React, { useState, useCallback } from "react";

type InteractionState = "idle" | "hovered" | "pressed" | "focused" | "disabled";

interface InteractiveElementProps {
  as?: "button" | "div" | "a";
  stateLayerColor?: string;
  disabled?: boolean;
  children: React.ReactNode | ((state: InteractionState) => React.ReactNode);
  onClick?: () => void;
  href?: string;
  style?: React.CSSProperties;
}

const stateLayerOpacity: Record<InteractionState, number> = {
  idle: 0,
  hovered: 0.08,
  pressed: 0.12,
  focused: 0.12,
  disabled: 0,
};

export function InteractiveElement({
  as: Component = "div",
  stateLayerColor = "#000000",
  disabled = false,
  children,
  onClick,
  href,
  style,
}: InteractiveElementProps) {
  const [state, setState] = useState<InteractionState>(
    disabled ? "disabled" : "idle",
  );

  const handleMouseEnter = useCallback(
    () => !disabled && setState("hovered"),
    [disabled],
  );
  const handleMouseLeave = useCallback(
    () => !disabled && setState("idle"),
    [disabled],
  );
  const handleMouseDown = useCallback(
    () => !disabled && setState("pressed"),
    [disabled],
  );
  const handleMouseUp = useCallback(
    () => !disabled && setState("hovered"),
    [disabled],
  );
  const handleFocus = useCallback(
    () => !disabled && setState("focused"),
    [disabled],
  );
  const handleBlur = useCallback(
    () => !disabled && setState("idle"),
    [disabled],
  );

  const opacity = stateLayerOpacity[state];

  const baseProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onClick: disabled ? undefined : onClick,
    style: {
      position: "relative" as const,
      overflow: "hidden" as const,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      ...style,
    },
  };

  return (
    <Component {...baseProps} {...(Component === "a" ? { href } : {})}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: stateLayerColor,
          opacity,
          transition: "opacity 150ms ease",
          pointerEvents: "none",
        }}
      />
      {typeof children === "function" ? children(state) : children}
    </Component>
  );
}
