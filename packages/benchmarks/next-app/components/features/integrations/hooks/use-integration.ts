"use client";

import { useState, useCallback } from "react";

interface IntegrationConfig {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  config: Record<string, string>;
}

export function useIntegration(integrationId: string) {
  const [integration, setIntegration] = useState<IntegrationConfig | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      setIntegration((prev) =>
        prev ? { ...prev, status: "connected" } : null,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      setIntegration((prev) =>
        prev ? { ...prev, status: "disconnected" } : null,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback((config: Record<string, string>) => {
    setIntegration((prev) => (prev ? { ...prev, config } : null));
  }, []);

  return { integration, isLoading, connect, disconnect, updateConfig };
}
