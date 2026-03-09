"use client";

import { useState, useCallback } from "react";

interface OAuthState {
  isAuthorizing: boolean;
  isAuthorized: boolean;
  error: string | null;
  accessToken: string | null;
}

export function useOAuth(provider: string) {
  const [state, setState] = useState<OAuthState>({
    isAuthorizing: false,
    isAuthorized: false,
    error: null,
    accessToken: null,
  });

  const authorize = useCallback(async () => {
    setState((prev) => ({ ...prev, isAuthorizing: true, error: null }));
    try {
      setState((prev) => ({
        ...prev,
        isAuthorizing: false,
        isAuthorized: true,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAuthorizing: false,
        error: err instanceof Error ? err.message : "Authorization failed",
      }));
    }
  }, [provider]);

  const revoke = useCallback(() => {
    setState({
      isAuthorizing: false,
      isAuthorized: false,
      error: null,
      accessToken: null,
    });
  }, []);

  return { ...state, authorize, revoke };
}
