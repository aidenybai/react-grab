"use client";

import React, { useState, FormEvent } from "react";

interface SignupFormProps {
  onSubmit?: (data: { name: string; email: string; password: string }) => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  return errors;
}

export function SignupForm({
  onSubmit,
  isLoading = false,
  error,
  className,
}: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordErrors = password ? validatePassword(password) : [];
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwordErrors.length === 0 && passwordsMatch) {
      onSubmit?.({ name, email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className ?? ""}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
        <p className="text-sm text-gray-500">
          Enter your details to get started
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="signup-name"
          className="text-sm font-medium text-gray-700"
        >
          Full name
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="signup-email"
          className="text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="signup-password"
          className="text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {passwordErrors.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs text-red-500">
            {passwordErrors.map((err) => (
              <li key={err}>- {err}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="signup-confirm"
          className="text-sm font-medium text-gray-700"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {confirmPassword && !passwordsMatch && (
          <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || passwordErrors.length > 0}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export default SignupForm;
