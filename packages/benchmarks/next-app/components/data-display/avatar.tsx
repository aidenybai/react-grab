"use client";

import React from "react";

interface DataAvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};
const statusDotSize = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};
const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
  away: "bg-yellow-500",
};

function generateColor(name: string) {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  name,
  size = "md",
  status,
  className,
}: DataAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative inline-flex ${className || ""}`}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-medium text-white ${sizeMap[size]} ${!src ? generateColor(name) : ""}`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusDotSize[size]} ${statusColors[status]}`}
        />
      )}
    </div>
  );
}
