"use client";

export default function ToolbarEntriesPage() {
  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Toolbar Entries Demo
      </h1>
      <p style={{ color: "#666", marginBottom: 24, lineHeight: 1.6 }}>
        The toolbar entries plugin is registered globally. Look at the React
        Grab toolbar — three new buttons should appear:
      </p>
      <ul
        style={{
          listStyle: "disc",
          paddingLeft: 24,
          marginBottom: 24,
          lineHeight: 2,
        }}
      >
        <li>
          <strong>🐛</strong> — Opens a debug panel dropdown with badge controls
        </li>
        <li>
          <strong>⊙ (SVG circle)</strong> — Action-only button, logs a
          screenshot event to console
        </li>
        <li>
          <strong>● (gray dot)</strong> — Click to toggle connection status
          color (green/red)
        </li>
      </ul>
    </div>
  );
}
