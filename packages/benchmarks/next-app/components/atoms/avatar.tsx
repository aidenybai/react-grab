"use client";

import React, { memo, useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  borderColor?: string;
  showBorder?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

export const Avatar = memo(function Avatar({
  src,
  name,
  size = 40,
  borderColor = "#FFFFFF",
  showBorder = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !src || imgError;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: showFallback ? hashColor(name) : undefined,
        color: "#FFFFFF",
        fontSize: size * 0.38,
        fontWeight: 600,
        border: showBorder ? `2px solid ${borderColor}` : "none",
      }}
    >
      {showFallback ? (
        getInitials(name)
      ) : (
        <img
          src={src!}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </div>
  );
});
