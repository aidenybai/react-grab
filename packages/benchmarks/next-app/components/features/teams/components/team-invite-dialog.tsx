"use client";

import { useState, useCallback } from "react";

interface TeamInviteDialogProps {
  isOpen: boolean;
  teamName: string;
  onInvite: (email: string, role: string) => void;
  onClose: () => void;
}

export function TeamInviteDialog({
  isOpen,
  teamName,
  onInvite,
  onClose,
}: TeamInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email.trim()) {
        onInvite(email.trim(), role);
        setEmail("");
        setRole("member");
      }
    },
    [email, role, onInvite],
  );

  if (!isOpen) return null;

  return (
    <div className="team-invite-dialog__overlay" onClick={onClose}>
      <div className="team-invite-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Invite to {teamName}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="team-invite-dialog__actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
