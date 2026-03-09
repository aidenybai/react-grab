"use client";
import React from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface MetricChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  barColor?: string;
  showLabels?: boolean;
}

export const MetricChart = ({
  data,
  title,
  height = 200,
  barColor = "#2563eb",
  showLabels = true,
}: MetricChartProps) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = data.length > 0 ? Math.max(100 / data.length - 2, 4) : 10;

  return (
    <div data-testid="deep-metric-chart" style={{ width: "100%" }}>
      {title && (
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "12px",
          }}
        >
          {title}
        </h3>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1="0"
            y1={height - pct * (height - 20)}
            x2="100"
            y2={height - pct * (height - 20)}
            stroke="#f3f4f6"
            strokeWidth="0.5"
          />
        ))}

        {data.map((point, i) => {
          const barHeight = (point.value / maxValue) * (height - 20);
          const x = (i / data.length) * 100 + 1;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx="1"
                opacity={0.85}
              />
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={height - barHeight - 3}
                  textAnchor="middle"
                  fontSize="3"
                  fill="#6b7280"
                >
                  {point.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {showLabels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
          }}
        >
          {data.map((point) => (
            <span
              key={point.label}
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                flex: 1,
                textAlign: "center",
              }}
            >
              {point.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
