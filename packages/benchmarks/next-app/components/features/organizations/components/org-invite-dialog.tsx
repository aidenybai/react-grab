"use client";

import { useState, useCallback } from "react";

interface OrgInviteDialogProps {
  isOpen: boolean;
  orgName: string;
  teams: Array<{ id: string; name: string }>;
  onInvite: (emails: string[], role: string, teamIds: string[]) => void;
  onClose: () => void;
}

export function OrgInviteDialog({
  isOpen,
  orgName,
  teams,
  onInvite,
  onClose,
}: OrgInviteDialogProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("member");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const emailList = emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      onInvite(emailList, role, selectedTeams);
      setEmails("");
    },
    [emails, role, selectedTeams, onInvite],
  );

  if (!isOpen) return null;

  return (
    <div className="org-invite-dialog__overlay" onClick={onClose}>
      <div className="org-invite-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Invite to {orgName}</h2>
        <form onSubmit={handleSubmit}>
          <div className="org-invite-dialog__field">
            <label>Email addresses (comma separated)</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <div className="org-invite-dialog__field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="org-invite-dialog__field">
            <label>Add to Teams</label>
            {teams.map((team) => (
              <label key={team.id}>
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.id)}
                  onChange={(e) => {
                    setSelectedTeams((prev) =>
                      e.target.checked
                        ? [...prev, team.id]
                        : prev.filter((id) => id !== team.id),
                    );
                  }}
                />
                {team.name}
              </label>
            ))}
          </div>
          <div className="org-invite-dialog__actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Send Invites
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
