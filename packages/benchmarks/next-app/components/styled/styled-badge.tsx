"use client";
import styled from "styled-components";

const BadgeBase = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $color }) => $color || "var(--accent)"};
  color: ${({ $color }) => ($color ? "#fff" : "var(--accent-foreground)")};
`;

export function StyledBadge({
  children,
  color,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  color?: string;
  "data-testid"?: string;
}) {
  return (
    <BadgeBase $color={color} data-testid={testId}>
      {children}
    </BadgeBase>
  );
}
