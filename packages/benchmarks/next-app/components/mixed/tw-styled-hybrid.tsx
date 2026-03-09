"use client";
import React from "react";
import styled from "styled-components";

const HybridCard = styled.div`
  border: 1px solid var(--border);
  transition: transform 0.2s;
  &:hover {
    transform: scale(1.02);
  }
`;

const HybridButton = styled.button`
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  &:active {
    transform: scale(0.98);
  }
`;

export function TwStyledHybrid({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <HybridCard
      className="rounded-xl bg-[var(--background)] p-6 shadow-sm"
      data-testid={testId}
    >
      <h3 className="text-lg font-semibold mb-2 text-[var(--foreground)]">
        Tailwind + styled-components
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">
        This card has styled-components for interactions and Tailwind for
        layout.
      </p>
      <div className="flex gap-2">
        <HybridButton
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium"
          data-testid="tw-styled-hybrid-button"
        >
          Hybrid Primary
        </HybridButton>
        <HybridButton className="px-4 py-2 rounded-lg bg-[var(--muted)] text-[var(--foreground)] text-sm font-medium border border-[var(--border)]">
          Hybrid Secondary
        </HybridButton>
      </div>
    </HybridCard>
  );
}
