"use client";

interface TeamBillingCardProps {
  plan: string;
  seats: number;
  usedSeats: number;
  pricePerSeat: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
}

export function TeamBillingCard({
  plan,
  seats,
  usedSeats,
  pricePerSeat,
  billingCycle,
  nextBillingDate,
  onUpgrade,
  onManageBilling,
}: TeamBillingCardProps) {
  const totalCost = seats * pricePerSeat;
  const usagePercent = Math.round((usedSeats / seats) * 100);

  return (
    <div className="team-billing-card">
      <div className="team-billing-card__header">
        <h3>Billing</h3>
        <span className="team-billing-card__plan-badge">{plan}</span>
      </div>
      <div className="team-billing-card__details">
        <div className="team-billing-card__row">
          <span>Seats</span>
          <span>
            {usedSeats} / {seats} ({usagePercent}%)
          </span>
        </div>
        <div className="team-billing-card__row">
          <span>Cost</span>
          <span>
            ${totalCost}/{billingCycle === "monthly" ? "mo" : "yr"}
          </span>
        </div>
        <div className="team-billing-card__row">
          <span>Next billing</span>
          <span>{nextBillingDate}</span>
        </div>
      </div>
      <div className="team-billing-card__actions">
        {onUpgrade && (
          <button className="btn btn-primary" onClick={onUpgrade}>
            Upgrade
          </button>
        )}
        {onManageBilling && (
          <button className="btn btn-outline" onClick={onManageBilling}>
            Manage Billing
          </button>
        )}
      </div>
    </div>
  );
}
