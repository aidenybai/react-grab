"use client";

import React from "react";

interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  status?: "active" | "inactive" | "pending";
  joinDate?: string;
  stats?: { label: string; value: string | number }[];
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const statusBadges: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

export function UserCard({
  name,
  email,
  avatar,
  role = "Member",
  status = "active",
  joinDate,
  stats,
  onEdit,
  onDelete,
  className,
}: UserCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`rounded-lg border bg-white p-5 ${className ?? ""}`}>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-indigo-100">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-indigo-600">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {name}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadges[status]}`}
            >
              {status}
            </span>
          </div>
          <p className="truncate text-xs text-gray-500">{email}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>{role}</span>
            {joinDate && (
              <>
                <span>&middot;</span>
                <span>Joined {new Date(joinDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {stat.value}
              </p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserCard;
