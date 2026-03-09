"use client";

interface OrgBillingCardProps {
  plan: string;
  totalSeats: number;
  usedSeats: number;
  monthlyTotal: number;
  currency: string;
  nextBillingDate: string;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function OrgBillingCard({
  plan,
  totalSeats,
  usedSeats,
  monthlyTotal,
  currency,
  nextBillingDate,
  onUpgrade,
  onManage,
}: OrgBillingCardProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(monthlyTotal);

  return (
    <div className="org-billing-card">
      <div className="org-billing-card__header">
        <h3>Billing Overview</h3>
        <span className="org-billing-card__plan">{plan}</span>
      </div>
      <div className="org-billing-card__stats">
        <div className="org-billing-card__stat">
          <span className="org-billing-card__stat-label">Seats</span>
          <span className="org-billing-card__stat-value">
            {usedSeats} / {totalSeats}
          </span>
        </div>
        <div className="org-billing-card__stat">
          <span className="org-billing-card__stat-label">Monthly Total</span>
          <span className="org-billing-card__stat-value">{formatted}</span>
        </div>
        <div className="org-billing-card__stat">
          <span className="org-billing-card__stat-label">Next Billing</span>
          <span className="org-billing-card__stat-value">
            {nextBillingDate}
          </span>
        </div>
      </div>
      <div className="org-billing-card__actions">
        {onUpgrade && (
          <button className="btn btn-primary" onClick={onUpgrade}>
            Upgrade Plan
          </button>
        )}
        {onManage && (
          <button className="btn btn-outline" onClick={onManage}>
            Manage Billing
          </button>
        )}
      </div>
    </div>
  );
}
