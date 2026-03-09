"use client";
import styled from "styled-components";

const CellContainer = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--foreground);
  vertical-align: middle;
`;

const CellLabel = styled.span`
  font-weight: 500;
  display: block;
`;

const CellSub = styled.span`
  font-size: 12px;
  color: var(--muted-foreground);
`;

export function StyledDataCell({
  label,
  sub,
  "data-testid": testId,
}: {
  label: string;
  sub?: string;
  "data-testid"?: string;
}) {
  return (
    <CellContainer data-testid={testId}>
      <CellLabel>{label}</CellLabel>
      {sub && <CellSub>{sub}</CellSub>}
    </CellContainer>
  );
}
