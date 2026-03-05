import type React from "react";

// ---- Bounding box constants (pixel positions within 1920x1080 viewport) ----
// These are fixed positions so scenes can reference them for cursor waypoints and selection boxes.
// All values are relative to the top-left of the 1920x1080 viewport.

const DASHBOARD_PADDING = 120;
const HEADER_TOP = DASHBOARD_PADDING;
const HEADER_HEIGHT = 56;
const CARDS_TOP = HEADER_TOP + HEADER_HEIGHT + 40;
const CARD_GAP = 32;
const CONTENT_WIDTH = 1920 - DASHBOARD_PADDING * 2; // 1680
const CARD_WIDTH = (CONTENT_WIDTH - CARD_GAP * 2) / 3; // ~538.67
const CARD_HEIGHT = 140;
const TABLE_TOP = CARDS_TOP + CARD_HEIGHT + 40;
const TABLE_HEADER_HEIGHT = 48;
const TABLE_ROW_HEIGHT = 56;

/** Revenue metric card bounding box */
export const METRIC_CARD_REVENUE = {
  x: DASHBOARD_PADDING,
  y: CARDS_TOP,
  width: Math.floor(CARD_WIDTH),
  height: CARD_HEIGHT,
};

/** Users metric card bounding box */
export const METRIC_CARD_USERS = {
  x: DASHBOARD_PADDING + Math.floor(CARD_WIDTH) + CARD_GAP,
  y: CARDS_TOP,
  width: Math.floor(CARD_WIDTH),
  height: CARD_HEIGHT,
};

/** Orders metric card bounding box */
export const METRIC_CARD_ORDERS = {
  x: DASHBOARD_PADDING + (Math.floor(CARD_WIDTH) + CARD_GAP) * 2,
  y: CARDS_TOP,
  width: Math.floor(CARD_WIDTH),
  height: CARD_HEIGHT,
};

/** Export button bounding box */
export const EXPORT_BUTTON = {
  x: 1920 - DASHBOARD_PADDING - 120,
  y: HEADER_TOP + 8,
  width: 120,
  height: 40,
};

/** Activity row bounding boxes */
const ACTIVITY_ROW_Y_START = TABLE_TOP + TABLE_HEADER_HEIGHT;
export const ACTIVITY_ROW_SIGNUP = {
  x: DASHBOARD_PADDING,
  y: ACTIVITY_ROW_Y_START,
  width: CONTENT_WIDTH,
  height: TABLE_ROW_HEIGHT,
};

export const ACTIVITY_ROW_ORDER = {
  x: DASHBOARD_PADDING,
  y: ACTIVITY_ROW_Y_START + TABLE_ROW_HEIGHT,
  width: CONTENT_WIDTH,
  height: TABLE_ROW_HEIGHT,
};

export const ACTIVITY_ROW_PAYMENT = {
  x: DASHBOARD_PADDING,
  y: ACTIVITY_ROW_Y_START + TABLE_ROW_HEIGHT * 2,
  width: CONTENT_WIDTH,
  height: TABLE_ROW_HEIGHT,
};

// ---- Activity data ----
const ACTIVITY_DATA = [
  { label: "New signup", time: "2m ago" },
  { label: "Order placed", time: "5m ago" },
  { label: "Payment received", time: "12m ago" },
];

// ---- Metric data ----
const METRIC_DATA = [
  { title: "Revenue", value: "$12.4k", change: "+12.5%", positive: true },
  { title: "Users", value: "2,847", change: "+8.2%", positive: true },
  { title: "Orders", value: "384", change: "-2.1%", positive: false },
];

// ---- Dashboard component ----
export const Dashboard: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#ffffff",
        padding: DASHBOARD_PADDING,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: HEADER_HEIGHT,
          marginBottom: 40,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#111111",
              lineHeight: 1.2,
            }}
          >
            Overview
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#888888",
              marginTop: 4,
            }}
          >
            Last 30 days
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: EXPORT_BUTTON.x,
            top: EXPORT_BUTTON.y,
            width: EXPORT_BUTTON.width,
            height: EXPORT_BUTTON.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f4f4f5",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            color: "#555555",
          }}
        >
          Export
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "flex",
          gap: CARD_GAP,
          marginBottom: 40,
        }}
      >
        {METRIC_DATA.map((metric) => (
          <div
            key={metric.title}
            style={{
              flex: 1,
              height: CARD_HEIGHT,
              padding: 24,
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#888888",
                marginBottom: 8,
              }}
            >
              {metric.title}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: "#111111",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {metric.value}
            </div>
            <div
              style={{
                fontSize: 14,
                color: metric.positive ? "#16a34a" : "#dc2626",
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e5e5",
          overflow: "hidden",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            height: TABLE_HEADER_HEIGHT,
            display: "flex",
            alignItems: "center",
            paddingLeft: 24,
            paddingRight: 24,
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "#888888",
            }}
          >
            Recent Activity
          </div>
        </div>

        {/* Table Rows */}
        {ACTIVITY_DATA.map((activity, i) => (
          <div
            key={activity.label}
            style={{
              height: TABLE_ROW_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 24,
              paddingRight: 24,
              borderBottom:
                i < ACTIVITY_DATA.length - 1
                  ? "1px solid #e5e5e5"
                  : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Placeholder avatar circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#e5e7eb",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  color: "#333333",
                }}
              >
                {activity.label}
              </span>
            </div>
            <span
              style={{
                fontSize: 14,
                color: "#888888",
              }}
            >
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
