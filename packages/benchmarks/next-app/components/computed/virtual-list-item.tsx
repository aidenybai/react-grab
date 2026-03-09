"use client";
import React from "react";
import styled from "styled-components";

const VirtualRow = styled.div<{ $index: number }>`
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: ${({ $index }) => ($index % 2 === 0 ? "var(--background)" : "var(--muted)")};
  font-size: 14px;
`;

export function VirtualListItem({
  index,
  label,
  "data-testid": testId,
}: {
  index: number;
  label: string;
  "data-testid"?: string;
}) {
  return (
    <VirtualRow $index={index} data-testid={testId}>
      <span style={{ width: 40, color: "var(--muted-foreground)" }}>
        #{index}
      </span>
      <span>{label}</span>
    </VirtualRow>
  );
}
