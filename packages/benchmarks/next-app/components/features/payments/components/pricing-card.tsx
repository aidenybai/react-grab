"use client";

import { memo } from "react";

interface PricingCardProps {
  name: string;
  price: number;
  currency: string;
  period: "monthly" | "yearly";
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
}

export const PricingCard = memo(function PricingCard({
  name,
  price,
  currency,
  period,
  features,
  isPopular,
  isCurrentPlan,
  onSelect,
}: PricingCardProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);

  return (
    <div className={`pricing-card ${isPopular ? "pricing-card--popular" : ""}`}>
      {isPopular && <span className="pricing-card__badge">Most Popular</span>}
      <h3 className="pricing-card__name">{name}</h3>
      <div className="pricing-card__price">
        <span className="pricing-card__amount">{formatted}</span>
        <span className="pricing-card__period">
          /{period === "monthly" ? "mo" : "yr"}
        </span>
      </div>
      <ul className="pricing-card__features">
        {features.map((feature, i) => (
          <li key={i} className="pricing-card__feature">
            {feature}
          </li>
        ))}
      </ul>
      <button
        className={`btn ${isCurrentPlan ? "btn-outline" : "btn-primary"} pricing-card__cta`}
        onClick={onSelect}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? "Current Plan" : "Select Plan"}
      </button>
    </div>
  );
});
