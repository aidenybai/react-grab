"use client";

import { forwardRef } from "react";

interface TeamMemberCardProps {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isOnline?: boolean;
  onMessage?: () => void;
}

export const TeamMemberCard = forwardRef<HTMLDivElement, TeamMemberCardProps>(
  function TeamMemberCard(
    { name, email, role, avatarUrl, isOnline, onMessage },
    ref,
  ) {
    return (
      <div ref={ref} className="team-member-card">
        <div className="team-member-card__avatar-wrapper">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="team-member-card__avatar"
            />
          ) : (
            <span className="team-member-card__avatar-fallback">{name[0]}</span>
          )}
          {isOnline && <span className="team-member-card__status-dot" />}
        </div>
        <h4 className="team-member-card__name">{name}</h4>
        <p className="team-member-card__email">{email}</p>
        <span className="team-member-card__role-badge">{role}</span>
        {onMessage && (
          <button className="btn btn-sm" onClick={onMessage}>
            Message
          </button>
        )}
      </div>
    );
  },
);
