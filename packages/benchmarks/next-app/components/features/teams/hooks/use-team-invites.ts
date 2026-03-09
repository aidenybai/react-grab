"use client";

import { useState, useCallback } from "react";

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  createdAt: Date;
}

export function useTeamInvites(teamId: string) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendInvite = useCallback((email: string, role: string) => {
    const invite: TeamInvite = {
      id: `inv-${Date.now()}`,
      email,
      role,
      status: "pending",
      createdAt: new Date(),
    };
    setInvites((prev) => [...prev, invite]);
  }, []);

  const revokeInvite = useCallback((inviteId: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  const resendInvite = useCallback((inviteId: string) => {}, []);

  return { invites, isLoading, sendInvite, revokeInvite, resendInvite };
}
