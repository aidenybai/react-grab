"use client";

import { useState, useCallback } from "react";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
  teams: string[];
}

export function useOrgMembers(orgId: string) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const invite = useCallback(
    (emails: string[], role: string, teamIds: string[]) => {
      const newMembers = emails.map((email) => ({
        id: `member-${Date.now()}-${Math.random()}`,
        name: email.split("@")[0],
        email,
        role,
        teams: teamIds,
      }));
      setMembers((prev) => [...prev, ...newMembers]);
    },
    [],
  );

  const remove = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const changeRole = useCallback((memberId: string, role: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
  }, []);

  return { members, isLoading, invite, remove, changeRole };
}
