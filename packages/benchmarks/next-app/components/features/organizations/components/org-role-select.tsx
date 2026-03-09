"use client";

interface OrgRoleSelectProps {
  value: string;
  onChange?: (role: string) => void;
  disabled?: boolean;
}

const ROLES = [
  {
    value: "owner",
    label: "Owner",
    description: "Full access, can delete organization",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage members, teams, and settings",
  },
  {
    value: "member",
    label: "Member",
    description: "Can access assigned features",
  },
];

export function OrgRoleSelect({
  value,
  onChange,
  disabled,
}: OrgRoleSelectProps) {
  return (
    <div className="org-role-select">
      <label className="org-role-select__label">Role</label>
      <select
        className="org-role-select__input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      >
        {ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label} — {role.description}
          </option>
        ))}
      </select>
    </div>
  );
}
