"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  user: { name: string } | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name: string } | null>({
    name: "Test User",
  });
  return (
    <AuthContext.Provider
      value={{
        user,
        login: (name: string) => setUser({ name }),
        logout: () => setUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
