"use client";

import { memo } from "react";

interface TeamCardProps {
  name: string;
  slug: string;
  memberCount: number;
  avatarUrl?: string;
  plan?: string;
  onClick?: () => void;
}

export const TeamCard = memo(function TeamCard({
  name,
  slug,
  memberCount,
  avatarUrl,
  plan,
  onClick,
}: TeamCardProps) {
  return (
    <div className="team-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="team-card__avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="team-card__avatar-img" />
        ) : (
          <span className="team-card__avatar-fallback">{name[0]}</span>
        )}
      </div>
      <div className="team-card__info">
        <h3 className="team-card__name">{name}</h3>
        <p className="team-card__slug">/{slug}</p>
        <p className="team-card__members">{memberCount} members</p>
      </div>
      {plan && <span className="team-card__badge">{plan}</span>}
    </div>
  );
});
