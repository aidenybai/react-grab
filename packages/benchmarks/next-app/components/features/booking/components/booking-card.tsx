"use client";
import React from "react";

interface BookingCardProps {
  title: string;
  date: string;
  duration: string;
  status: "pending" | "confirmed" | "cancelled";
  host: string;
}

export const BookingCard = ({
  title,
  date,
  duration,
  status,
  host,
}: BookingCardProps) => {
  const statusColors = {
    pending: "#f59e0b",
    confirmed: "#10b981",
    cancelled: "#ef4444",
  };

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
          {title}
        </h3>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 500,
            color: statusColors[status],
            background: `${statusColors[status]}15`,
          }}
        >
          {status}
        </span>
      </div>
      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
        {date} &middot; {duration}
      </p>
      <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
        with {host}
      </p>
    </div>
  );
};
