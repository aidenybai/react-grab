import { memo } from "react";

interface TeamRoleBadgeProps {
  role: "owner" | "admin" | "member";
  className?: string;
}

const roleStyles: Record<string, { bg: string; text: string }> = {
  owner: { bg: "#fef3c7", text: "#92400e" },
  admin: { bg: "#dbeafe", text: "#1e40af" },
  member: { bg: "#f3f4f6", text: "#374151" },
};

export const TeamRoleBadge = memo(function TeamRoleBadge({
  role,
  className,
}: TeamRoleBadgeProps) {
  const style = roleStyles[role] ?? roleStyles.member;
  return (
    <span
      className={`team-role-badge ${className ?? ""}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {role}
    </span>
  );
});
