"use client";

import { memo } from "react";

interface OrgCardProps {
  name: string;
  slug: string;
  memberCount: number;
  teamCount: number;
  logoUrl?: string;
  plan?: string;
  onClick?: () => void;
}

export const OrgCard = memo(function OrgCard({
  name,
  slug,
  memberCount,
  teamCount,
  logoUrl,
  plan,
  onClick,
}: OrgCardProps) {
  return (
    <div className="org-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="org-card__logo">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="org-card__logo-img" />
        ) : (
          <span className="org-card__logo-fallback">{name[0]}</span>
        )}
      </div>
      <div className="org-card__info">
        <h3 className="org-card__name">{name}</h3>
        <p className="org-card__slug">/{slug}</p>
        <div className="org-card__stats">
          <span>{memberCount} members</span>
          <span>{teamCount} teams</span>
        </div>
      </div>
      {plan && <span className="org-card__plan-badge">{plan}</span>}
    </div>
  );
});
