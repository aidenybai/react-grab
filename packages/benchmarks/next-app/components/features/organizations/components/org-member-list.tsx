"use client";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  teams: string[];
  avatarUrl?: string;
}

interface OrgMemberListProps {
  members: OrgMember[];
  onRemove?: (memberId: string) => void;
  onChangeRole?: (memberId: string, role: string) => void;
  canManage?: boolean;
}

export function OrgMemberList({
  members,
  onRemove,
  onChangeRole,
  canManage = false,
}: OrgMemberListProps) {
  return (
    <div className="org-member-list">
      <div className="org-member-list__header">
        <span>Member</span>
        <span>Role</span>
        <span>Teams</span>
        {canManage && <span>Actions</span>}
      </div>
      {members.map((member) => (
        <div key={member.id} className="org-member-list__row">
          <div className="org-member-list__member">
            <span className="org-member-list__avatar">{member.name[0]}</span>
            <div>
              <p className="org-member-list__name">{member.name}</p>
              <p className="org-member-list__email">{member.email}</p>
            </div>
          </div>
          <span className="org-member-list__role">{member.role}</span>
          <span className="org-member-list__teams">
            {member.teams.join(", ")}
          </span>
          {canManage && member.role !== "owner" && (
            <div className="org-member-list__actions">
              <button
                className="btn btn-sm"
                onClick={() => onChangeRole?.(member.id, "admin")}
              >
                Change Role
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onRemove?.(member.id)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
