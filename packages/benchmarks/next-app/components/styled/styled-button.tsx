"use client";
import styled from "styled-components";

const ButtonBase = styled.button<{
  $variant?: "primary" | "secondary" | "ghost";
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;

  ${({ $variant }) => {
    switch ($variant) {
      case "secondary":
        return `
          background: var(--muted);
          color: var(--foreground);
          border-color: var(--border);
          &:hover { background: var(--accent); }
        `;
      case "ghost":
        return `
          background: transparent;
          color: var(--foreground);
          &:hover { background: var(--muted); }
        `;
      default:
        return `
          background: var(--primary);
          color: var(--primary-foreground);
          &:hover { opacity: 0.9; }
        `;
    }
  }}
`;

export function StyledButton({
  children,
  variant = "primary",
  onClick,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  "data-testid"?: string;
}) {
  return (
    <ButtonBase $variant={variant} onClick={onClick} data-testid={testId}>
      {children}
    </ButtonBase>
  );
}
