"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  size?: "sm" | "md";
}

function getPageNumbers(
  current: number,
  total: number,
  siblings: number,
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);

  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = false,
  size = "md",
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages, siblingCount);
  const buttonSize = size === "sm" ? 28 : 36;
  const fontSize = size === "sm" ? 12 : 14;

  const PageButton = ({
    page,
    active,
    disabled,
    children,
  }: {
    page?: number;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={page !== undefined ? () => onPageChange(page) : undefined}
      disabled={disabled}
      style={{
        minWidth: buttonSize,
        height: buttonSize,
        padding: "0 6px",
        border: active ? "1px solid #3B82F6" : "1px solid #E5E7EB",
        borderRadius: 6,
        backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
        color: active ? "#1D4ED8" : disabled ? "#D1D5DB" : "#374151",
        fontSize,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );

  return (
    <nav
      aria-label="Pagination"
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      {showFirstLast && (
        <PageButton page={1} disabled={currentPage === 1}>
          &laquo;
        </PageButton>
      )}
      <PageButton page={currentPage - 1} disabled={currentPage === 1}>
        &lsaquo;
      </PageButton>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`dots-${i}`}
            style={{ padding: "0 4px", color: "#9CA3AF" }}
          >
            &hellip;
          </span>
        ) : (
          <PageButton key={p} page={p} active={p === currentPage}>
            {p}
          </PageButton>
        ),
      )}
      <PageButton page={currentPage + 1} disabled={currentPage === totalPages}>
        &rsaquo;
      </PageButton>
      {showFirstLast && (
        <PageButton page={totalPages} disabled={currentPage === totalPages}>
          &raquo;
        </PageButton>
      )}
    </nav>
  );
}
