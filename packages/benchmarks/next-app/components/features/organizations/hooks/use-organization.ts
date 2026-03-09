"use client";

import { useState, useCallback } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  teamCount: number;
  plan: string;
}

export function useOrganization(orgId?: string) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrg = useCallback(async (data: Partial<Organization>) => {
    setIsLoading(true);
    try {
      setOrg((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteOrg = useCallback(async () => {
    setIsLoading(true);
    try {
      setOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { org, isLoading, error, updateOrg, deleteOrg };
}
