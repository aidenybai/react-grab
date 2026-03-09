"use client";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatarUrl?: string;
}

interface TeamMemberListProps {
  members: TeamMember[];
  onRemoveMember?: (memberId: string) => void;
  onChangeRole?: (memberId: string, role: string) => void;
  isAdmin?: boolean;
}

export function TeamMemberList({
  members,
  onRemoveMember,
  onChangeRole,
  isAdmin = false,
}: TeamMemberListProps) {
  return (
    <div className="team-member-list">
      <div className="team-member-list__header">
        <span>Name</span>
        <span>Role</span>
        {isAdmin && <span>Actions</span>}
      </div>
      {members.map((member) => (
        <div key={member.id} className="team-member-list__row">
          <div className="team-member-list__info">
            <span className="team-member-list__avatar">{member.name[0]}</span>
            <div>
              <p className="team-member-list__name">{member.name}</p>
              <p className="team-member-list__email">{member.email}</p>
            </div>
          </div>
          <span className="team-member-list__role">{member.role}</span>
          {isAdmin && member.role !== "owner" && (
            <div className="team-member-list__actions">
              <button onClick={() => onChangeRole?.(member.id, "admin")}>
                Change Role
              </button>
              <button onClick={() => onRemoveMember?.(member.id)}>
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
