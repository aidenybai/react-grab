"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  avatar?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AUTH_STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "auth_user";

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    const userJson = localStorage.getItem(USER_STORAGE_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } else {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const user: User = {
        id: "usr_" + Math.random().toString(36).slice(2),
        email,
        name: email.split("@")[0],
        role: "user",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, "fake_token_" + Date.now());
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Login failed",
      }));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name: string }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const user: User = {
        id: "usr_" + Math.random().toString(36).slice(2),
        email: data.email,
        name: data.name,
        role: "user",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, "fake_token_" + Date.now());
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
    },
    [],
  );

  const hasRole = useCallback(
    (role: string) => state.user?.role === role,
    [state.user],
  );

  return useMemo(
    () => ({ ...state, login, logout, register, hasRole }),
    [state, login, logout, register, hasRole],
  );
}

export default useAuth;
