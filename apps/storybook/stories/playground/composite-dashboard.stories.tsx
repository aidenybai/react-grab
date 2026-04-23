import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { For } from "solid-js";

import "react-grab";

interface MetricCardData {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
}

interface RowData {
  id: string;
  name: string;
  email: string;
  status: "active" | "invited" | "disabled";
  role: string;
  lastActive: string;
}

const METRIC_CARDS: ReadonlyArray<MetricCardData> = [
  {
    id: "mrr",
    label: "Monthly Recurring Revenue",
    value: "$42,180",
    trend: "+12.4%",
    trendDirection: "up",
  },
  {
    id: "users",
    label: "Active Users",
    value: "3,847",
    trend: "+8.1%",
    trendDirection: "up",
  },
  {
    id: "churn",
    label: "Churn Rate",
    value: "2.3%",
    trend: "-0.4pp",
    trendDirection: "down",
  },
  {
    id: "nps",
    label: "NPS",
    value: "62",
    trend: "+3",
    trendDirection: "up",
  },
];

const TABLE_ROWS: ReadonlyArray<RowData> = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@acme.co",
    status: "active",
    role: "Admin",
    lastActive: "2 min ago",
  },
  {
    id: "2",
    name: "Jordan Kim",
    email: "jordan@acme.co",
    status: "active",
    role: "Editor",
    lastActive: "14 min ago",
  },
  {
    id: "3",
    name: "Sam Rivera",
    email: "sam@acme.co",
    status: "invited",
    role: "Viewer",
    lastActive: "—",
  },
  {
    id: "4",
    name: "Riley Chen",
    email: "riley@acme.co",
    status: "active",
    role: "Editor",
    lastActive: "1 hr ago",
  },
  {
    id: "5",
    name: "Taylor Brooks",
    email: "taylor@acme.co",
    status: "disabled",
    role: "Viewer",
    lastActive: "3 days ago",
  },
];

const BARS: ReadonlyArray<number> = [32, 48, 24, 68, 52, 74, 40, 82, 60, 44, 90, 56];

const statusStyles: Record<RowData["status"], { background: string; color: string }> = {
  active: { background: "#e6f6ea", color: "#1b7a3a" },
  invited: { background: "#fff4d6", color: "#8a6200" },
  disabled: { background: "#f1f1f1", color: "#6b6b6b" },
};

const SidebarLink = (props: { label: string; active?: boolean; component: string }) => (
  <a
    href="#"
    data-component={props.component}
    style={{
      display: "block",
      padding: "8px 12px",
      "border-radius": "6px",
      "font-size": "14px",
      "font-weight": props.active ? 600 : 500,
      color: props.active ? "#1a1a1a" : "#555",
      background: props.active ? "#f0f0f0" : "transparent",
      "text-decoration": "none",
      cursor: "pointer",
    }}
  >
    {props.label}
  </a>
);

const MetricCard = (props: { card: MetricCardData }) => (
  <article
    data-component="MetricCard"
    data-metric-id={props.card.id}
    style={{
      padding: "20px",
      background: "#fff",
      "border-radius": "12px",
      border: "1px solid #e5e5e5",
      "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.04)",
      display: "flex",
      "flex-direction": "column",
      gap: "8px",
    }}
  >
    <div style={{ "font-size": "13px", color: "#6b6b6b", "font-weight": 500 }}>
      {props.card.label}
    </div>
    <div style={{ "font-size": "28px", "font-weight": 700, "letter-spacing": "-0.02em" }}>
      {props.card.value}
    </div>
    <div
      data-component="MetricTrend"
      style={{
        "font-size": "12px",
        "font-weight": 600,
        color: props.card.trendDirection === "up" ? "#1b7a3a" : "#b4332b",
      }}
    >
      {props.card.trend}
    </div>
  </article>
);

const BarChart = () => (
  <section
    data-component="BarChart"
    style={{
      padding: "24px",
      background: "#fff",
      "border-radius": "12px",
      border: "1px solid #e5e5e5",
      "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.04)",
    }}
  >
    <header
      style={{
        display: "flex",
        "justify-content": "space-between",
        "align-items": "baseline",
        "margin-bottom": "16px",
      }}
    >
      <h3 style={{ margin: 0, "font-size": "16px", "font-weight": 600 }}>Signups (last 12 weeks)</h3>
      <span style={{ "font-size": "12px", color: "#6b6b6b" }}>Weekly</span>
    </header>
    <div
      style={{
        display: "flex",
        "align-items": "flex-end",
        gap: "8px",
        height: "160px",
      }}
    >
      <For each={BARS}>
        {(height, index) => (
          <div
            data-component="ChartBar"
            data-bar-index={index()}
            style={{
              flex: 1,
              height: `${height}%`,
              background: `linear-gradient(180deg, hsl(200, 70%, 55%), hsl(220, 80%, 45%))`,
              "border-radius": "4px 4px 0 0",
              "min-width": "12px",
            }}
          />
        )}
      </For>
    </div>
  </section>
);

const UsersTable = () => (
  <section
    data-component="UsersTable"
    style={{
      background: "#fff",
      "border-radius": "12px",
      border: "1px solid #e5e5e5",
      "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.04)",
      overflow: "hidden",
    }}
  >
    <header
      style={{
        padding: "16px 20px",
        "border-bottom": "1px solid #e5e5e5",
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}
    >
      <h3 style={{ margin: 0, "font-size": "16px", "font-weight": 600 }}>Team members</h3>
      <button
        data-component="InviteButton"
        style={{
          padding: "6px 12px",
          "font-size": "13px",
          "font-weight": 500,
          background: "#1a1a1a",
          color: "#fff",
          border: "none",
          "border-radius": "6px",
          cursor: "pointer",
        }}
      >
        Invite
      </button>
    </header>
    <table style={{ width: "100%", "border-collapse": "collapse", "font-size": "14px" }}>
      <thead>
        <tr style={{ background: "#fafafa", "text-align": "left" }}>
          <th style={{ padding: "12px 20px", "font-weight": 600, color: "#555" }}>Name</th>
          <th style={{ padding: "12px 20px", "font-weight": 600, color: "#555" }}>Role</th>
          <th style={{ padding: "12px 20px", "font-weight": 600, color: "#555" }}>Status</th>
          <th style={{ padding: "12px 20px", "font-weight": 600, color: "#555" }}>Last active</th>
        </tr>
      </thead>
      <tbody>
        <For each={TABLE_ROWS}>
          {(row) => (
            <tr
              data-component="UserRow"
              data-user-id={row.id}
              style={{ "border-top": "1px solid #f0f0f0" }}
            >
              <td style={{ padding: "14px 20px" }}>
                <div style={{ "font-weight": 500 }}>{row.name}</div>
                <div style={{ "font-size": "12px", color: "#6b6b6b" }}>{row.email}</div>
              </td>
              <td style={{ padding: "14px 20px", color: "#555" }}>{row.role}</td>
              <td style={{ padding: "14px 20px" }}>
                <span
                  data-component="StatusPill"
                  style={{
                    padding: "2px 8px",
                    "font-size": "12px",
                    "font-weight": 600,
                    "border-radius": "999px",
                    background: statusStyles[row.status].background,
                    color: statusStyles[row.status].color,
                    "text-transform": "capitalize",
                  }}
                >
                  {row.status}
                </span>
              </td>
              <td style={{ padding: "14px 20px", color: "#6b6b6b", "font-variant-numeric": "tabular-nums" }}>
                {row.lastActive}
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </section>
);

const Dashboard = () => (
  <div
    data-component="DashboardRoot"
    style={{
      "min-height": "100vh",
      display: "grid",
      "grid-template-columns": "240px 1fr",
      background: "#fafafa",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1a1a1a",
    }}
  >
    <aside
      data-component="Sidebar"
      style={{
        padding: "24px 16px",
        background: "#fff",
        "border-right": "1px solid #e5e5e5",
        display: "flex",
        "flex-direction": "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          padding: "0 12px 16px",
          "font-size": "15px",
          "font-weight": 700,
          "letter-spacing": "-0.02em",
        }}
      >
        Acme
      </div>
      <SidebarLink label="Overview" component="NavOverview" active />
      <SidebarLink label="Customers" component="NavCustomers" />
      <SidebarLink label="Invoices" component="NavInvoices" />
      <SidebarLink label="Settings" component="NavSettings" />
    </aside>

    <main data-component="DashboardMain" style={{ padding: "32px", display: "grid", gap: "24px" }}>
      <header
        data-component="DashboardHeader"
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
        }}
      >
        <h1 style={{ margin: 0, "font-size": "24px", "font-weight": 700 }}>Overview</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            data-component="FilterButton"
            style={{
              padding: "6px 12px",
              "font-size": "13px",
              "font-weight": 500,
              background: "#fff",
              border: "1px solid #d0d0d0",
              "border-radius": "6px",
              cursor: "pointer",
            }}
          >
            Last 30 days
          </button>
          <button
            data-component="ExportButton"
            style={{
              padding: "6px 12px",
              "font-size": "13px",
              "font-weight": 500,
              background: "#fff",
              border: "1px solid #d0d0d0",
              "border-radius": "6px",
              cursor: "pointer",
            }}
          >
            Export
          </button>
        </div>
      </header>

      <section
        data-component="MetricGrid"
        style={{
          display: "grid",
          "grid-template-columns": "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        <For each={METRIC_CARDS}>{(card) => <MetricCard card={card} />}</For>
      </section>

      <BarChart />

      <UsersTable />
    </main>
  </div>
);

const meta: Meta = {
  title: "Playground/Composite Dashboard",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Realistic dense dashboard DOM for ad-hoc hover/grab exercise. Replaces the gym dashboard. Press Alt (default activation) and hover around to test overlay behavior across sidebar, nav, metric cards, chart bars, and table rows.",
      },
    },
  },
  render: () => <Dashboard />,
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
