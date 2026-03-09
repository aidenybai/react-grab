import { memo } from "react";

interface SubscriptionBadgeProps {
  plan: string;
  status: "active" | "past_due" | "cancelled" | "trialing";
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "#065f46", bg: "#d1fae5" },
  past_due: { label: "Past Due", color: "#991b1b", bg: "#fee2e2" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f3f4f6" },
  trialing: { label: "Trial", color: "#1e40af", bg: "#dbeafe" },
};

export const SubscriptionBadge = memo(function SubscriptionBadge({
  plan,
  status,
  className,
}: SubscriptionBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.active;
  return (
    <span
      className={`subscription-badge ${className ?? ""}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: "4px 12px",
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {plan} — {config.label}
    </span>
  );
});
