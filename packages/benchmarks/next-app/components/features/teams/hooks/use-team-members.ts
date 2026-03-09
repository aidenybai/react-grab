"use client";

import { useState, useCallback } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
}

export function useTeamMembers(teamId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const removeMember = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const changeRole = useCallback(
    (memberId: string, role: TeamMember["role"]) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
      );
    },
    [],
  );

  const inviteMember = useCallback(
    (email: string, role: TeamMember["role"]) => {
      const newMember: TeamMember = {
        id: `pending-${Date.now()}`,
        name: email.split("@")[0],
        email,
        role,
      };
      setMembers((prev) => [...prev, newMember]);
    },
    [],
  );

  return { members, isLoading, removeMember, changeRole, inviteMember };
}
