"use client";
import styled from "styled-components";

const AvatarContainer = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => ($size || 40) * 0.4}px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
`;

export function StyledAvatar({
  initials,
  size,
  "data-testid": testId,
}: {
  initials: string;
  size?: number;
  "data-testid"?: string;
}) {
  return (
    <AvatarContainer $size={size} data-testid={testId}>
      {initials}
    </AvatarContainer>
  );
}
