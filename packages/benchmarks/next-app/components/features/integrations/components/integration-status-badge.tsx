import { memo } from "react";

interface IntegrationStatusBadgeProps {
  status: "connected" | "disconnected" | "error" | "pending";
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  connected: { label: "Connected", color: "#065f46", bg: "#d1fae5" },
  disconnected: { label: "Disconnected", color: "#6b7280", bg: "#f3f4f6" },
  error: { label: "Error", color: "#991b1b", bg: "#fee2e2" },
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
};

export const IntegrationStatusBadge = memo(function IntegrationStatusBadge({
  status,
  className,
}: IntegrationStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.disconnected;
  return (
    <span
      className={`integration-status-badge ${className ?? ""}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {config.label}
    </span>
  );
});
