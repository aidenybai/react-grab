"use client";
import React from "react";
import styles from "./module-table.module.css";

interface Row {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
}

const data: Row[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Admin",
    status: "active",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    role: "Editor",
    status: "active",
  },
  {
    id: "3",
    name: "Carol White",
    email: "carol@example.com",
    role: "Viewer",
    status: "inactive",
  },
  {
    id: "4",
    name: "Dan Brown",
    email: "dan@example.com",
    role: "Editor",
    status: "pending",
  },
];

const statusStyles: Record<string, string> = {
  active: styles.badgeGreen,
  inactive: styles.badgeRed,
  pending: styles.badgeYellow,
};

export function ModuleTable({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <div className={styles.tableWrapper} data-testid={testId}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className={styles.tr}>
              <td className={styles.td}>{row.name}</td>
              <td className={styles.td}>{row.email}</td>
              <td className={styles.td}>{row.role}</td>
              <td className={styles.td}>
                <span
                  className={statusStyles[row.status]}
                  data-testid={
                    row.id === "1" ? "module-table-badge" : undefined
                  }
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
