"use client";
import styled from "styled-components";

const CardContainer = styled.div`
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--background);
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--foreground);
`;

const CardBody = styled.div`
  font-size: 14px;
  color: var(--muted-foreground);
  line-height: 1.5;
`;

export function StyledCard({
  title,
  children,
  "data-testid": testId,
}: {
  title: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <CardContainer data-testid={testId}>
      <CardTitle>{title}</CardTitle>
      <CardBody>{children}</CardBody>
    </CardContainer>
  );
}
