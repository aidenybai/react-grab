"use client";
import React from "react";
import styled from "styled-components";
import styles from "./style-clash.module.css";

const StyledOuter = styled.div`
  border: 2px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
`;

const StyledInner = styled.div`
  padding: 20px;
  background: var(--background);
`;

const StyledBadge = styled.span`
  font-weight: 600;
`;

export function StyleClash({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <StyledOuter className={`${styles.wrapper} shadow-md`} data-testid={testId}>
      <StyledInner
        className={`${styles.inner} flex flex-col gap-3`}
        style={{ borderTop: "3px solid #8b5cf6" }}
      >
        <span
          className={`${styles.label} text-[var(--muted-foreground)] font-medium`}
        >
          Style Clash Zone
        </span>

        <p className="text-sm text-[var(--foreground)] leading-relaxed">
          This component mixes styled-components, Tailwind, CSS Modules, and
          inline styles. Good luck finding it from the DOM!
        </p>

        <div className="flex items-center gap-2">
          <StyledBadge
            className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800"
            style={{ letterSpacing: "0.02em" }}
            data-testid="style-clash-badge"
          >
            Mixed
          </StyledBadge>
          <StyledBadge
            className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
            style={{ letterSpacing: "0.02em" }}
          >
            Styling
          </StyledBadge>
        </div>

        <button
          data-testid="style-clash-button"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            color: "white",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          All Four Styles
        </button>
      </StyledInner>
    </StyledOuter>
  );
}
