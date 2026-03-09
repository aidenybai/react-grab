"use client";
import styled from "styled-components";

const LayoutGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns || 3}, 1fr);
  gap: 24px;
  padding: 24px;
`;

const LayoutSection = styled.section`
  padding: 32px 0;
  border-bottom: 1px solid var(--border);
  &:last-child {
    border-bottom: none;
  }
`;

const LayoutSectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--foreground);
`;

export function StyledGrid({
  children,
  columns,
}: {
  children: React.ReactNode;
  columns?: number;
}) {
  return <LayoutGrid $columns={columns}>{children}</LayoutGrid>;
}

export function StyledSection({
  title,
  children,
  "data-testid": testId,
}: {
  title: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <LayoutSection data-testid={testId}>
      <LayoutSectionTitle>{title}</LayoutSectionTitle>
      {children}
    </LayoutSection>
  );
}
