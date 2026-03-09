"use client";

import { useState, useCallback } from "react";

interface Team {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
}

export function useTeam(teamId: string) {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTeam = useCallback(async (data: Partial<Team>) => {
    setIsLoading(true);
    try {
      setTeam((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { team, isLoading, error, updateTeam };
}
