"use client";
import React from "react";

type BadgeVariant = "upcoming" | "past" | "recurring" | "rescheduled";

const badgeConfig: Record<
  BadgeVariant,
  { bg: string; text: string; label: string }
> = {
  upcoming: { bg: "#dbeafe", text: "#1e40af", label: "Upcoming" },
  past: { bg: "#f3f4f6", text: "#6b7280", label: "Past" },
  recurring: { bg: "#ede9fe", text: "#7c3aed", label: "Recurring" },
  rescheduled: { bg: "#fef3c7", text: "#92400e", label: "Rescheduled" },
};

export const BookingBadge = ({
  variant = "upcoming",
}: {
  variant?: BadgeVariant;
}) => {
  const config = badgeConfig[variant];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        background: config.bg,
        color: config.text,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {config.label}
    </span>
  );
};
