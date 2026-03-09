"use client";

import { memo } from "react";

interface TeamMemberAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const sizeMap = { sm: 24, md: 32, lg: 48 };

export const TeamMemberAvatar = memo(function TeamMemberAvatar({
  name,
  avatarUrl,
  size = "md",
  showTooltip = true,
}: TeamMemberAvatarProps) {
  const px = sizeMap[size];

  return (
    <div
      className="team-member-avatar"
      style={{ width: px, height: px }}
      title={showTooltip ? name : undefined}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="team-member-avatar__img"
          style={{ width: px, height: px, borderRadius: "50%" }}
        />
      ) : (
        <span
          className="team-member-avatar__fallback"
          style={{
            width: px,
            height: px,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "#e2e8f0",
            fontSize: px * 0.4,
          }}
        >
          {name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
});
