"use client";

import React, { useEffect, useState, ComponentType } from "react";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string; name: string } | null;
}

interface AuthGuardOptions {
  redirectTo?: string;
  fallback?: React.ReactNode;
  requiredRoles?: string[];
}

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: "1", email: "user@example.com", name: "Demo User" },
      });
    } else {
      setState({ isAuthenticated: false, isLoading: false, user: null });
    }
  }, []);

  return state;
}

export function withAuthGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: AuthGuardOptions = {},
) {
  const { redirectTo = "/auth/login", fallback } = options;

  function AuthGuardedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthState();

    if (isLoading) {
      return (
        fallback ?? (
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        )
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = redirectTo;
      }
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  AuthGuardedComponent.displayName = `withAuthGuard(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return AuthGuardedComponent;
}

export function AuthGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthState();

  if (isLoading) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
          </div>
        )}
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
