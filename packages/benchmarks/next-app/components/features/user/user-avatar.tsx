"use client";

import React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  status?: "online" | "offline" | "away" | "busy";
  showStatus?: boolean;
  border?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeMap: Record<
  AvatarSize,
  { container: string; text: string; status: string }
> = {
  xs: { container: "h-6 w-6", text: "text-[10px]", status: "h-1.5 w-1.5" },
  sm: { container: "h-8 w-8", text: "text-xs", status: "h-2 w-2" },
  md: { container: "h-10 w-10", text: "text-sm", status: "h-2.5 w-2.5" },
  lg: { container: "h-14 w-14", text: "text-lg", status: "h-3 w-3" },
  xl: { container: "h-20 w-20", text: "text-2xl", status: "h-4 w-4" },
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-500",
  busy: "bg-red-500",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-pink-500",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({
  src,
  name,
  size = "md",
  status,
  showStatus = true,
  border = false,
  className,
  onClick,
}: UserAvatarProps) {
  const styles = sizeMap[size];

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${onClick ? "cursor-pointer" : ""} ${className ?? ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div
        className={`overflow-hidden rounded-full ${styles.container} ${
          border ? "ring-2 ring-white" : ""
        }`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${hashColor(name)} ${styles.text} font-medium text-white`}
          >
            {getInitials(name)}
          </div>
        )}
      </div>
      {status && showStatus && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusColors[status]} ${styles.status}`}
        />
      )}
    </div>
  );
}

export function UserAvatarGroup({
  children,
  max = 5,
  className,
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const childArray = React.Children.toArray(children);
  const visible = childArray.slice(0, max);
  const overflow = childArray.length - max;

  return (
    <div className={`flex -space-x-2 ${className ?? ""}`}>
      {visible}
      {overflow > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
