import type { Component } from "solid-js";

interface SampleDashboardProps {
  captureRef: (element: HTMLElement | undefined) => void;
}

export const SampleDashboard: Component<SampleDashboardProps> = (props) => (
  <>
    <header
      ref={props.captureRef}
      data-story-id="header"
      data-component="AppHeader"
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        padding: "16px 32px",
        background: "#fff",
        "border-bottom": "1px solid #e5e5e5",
      }}
    >
      <h1
        ref={props.captureRef}
        data-story-id="logo"
        data-component="Logo"
        style={{
          "font-size": "18px",
          "font-weight": 700,
          margin: 0,
          "letter-spacing": "-0.02em",
        }}
      >
        Acme Dashboard
      </h1>
      <nav style={{ display: "flex", gap: "24px", "font-size": "14px" }}>
        <a
          ref={props.captureRef}
          data-story-id="nav-home"
          data-component="NavLink"
          href="#"
          style={{ color: "#1a1a1a", "text-decoration": "none", "font-weight": 500 }}
        >
          Home
        </a>
        <a
          ref={props.captureRef}
          data-story-id="nav-about"
          data-component="NavLink"
          href="#"
          style={{ color: "#666", "text-decoration": "none" }}
        >
          About
        </a>
      </nav>
    </header>

    <main
      style={{
        display: "grid",
        "grid-template-columns": "1fr 1fr",
        gap: "24px",
        padding: "32px",
        "max-width": "880px",
        margin: "0 auto",
      }}
    >
      <div
        ref={props.captureRef}
        data-story-id="card-welcome"
        data-component="WelcomeCard"
        style={{
          background: "#fff",
          "border-radius": "12px",
          padding: "24px",
          "box-shadow": "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #e5e5e5",
        }}
      >
        <h2 style={{ "font-size": "16px", "font-weight": 600, margin: "0 0 8px" }}>Welcome</h2>
        <p
          style={{
            "font-size": "14px",
            color: "#666",
            margin: "0 0 20px",
            "line-height": 1.5,
          }}
        >
          This is a sample dashboard. Select any element using the controls below to see React
          Grab's overlay.
        </p>
        <button
          ref={props.captureRef}
          data-story-id="btn-start"
          data-component="Button"
          style={{
            padding: "8px 16px",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            "border-radius": "8px",
            "font-size": "14px",
            "font-weight": 500,
            cursor: "pointer",
          }}
        >
          Get Started
        </button>
      </div>

      <div
        ref={props.captureRef}
        data-story-id="card-settings"
        data-component="SettingsCard"
        style={{
          background: "#fff",
          "border-radius": "12px",
          padding: "24px",
          "box-shadow": "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #e5e5e5",
        }}
      >
        <h2 style={{ "font-size": "16px", "font-weight": 600, margin: "0 0 8px" }}>Settings</h2>
        <label
          style={{
            "font-size": "13px",
            color: "#666",
            display: "block",
            "margin-bottom": "6px",
          }}
        >
          Display name
        </label>
        <input
          ref={props.captureRef}
          data-story-id="input"
          data-component="TextField"
          type="text"
          placeholder="Your name"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d4d4d4",
            "border-radius": "8px",
            "font-size": "14px",
            "margin-bottom": "16px",
            "box-sizing": "border-box",
            outline: "none",
          }}
        />
        <button
          ref={props.captureRef}
          data-story-id="btn-save"
          data-component="Button"
          style={{
            padding: "8px 16px",
            background: "#fff",
            color: "#1a1a1a",
            border: "1px solid #d4d4d4",
            "border-radius": "8px",
            "font-size": "14px",
            "font-weight": 500,
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </div>
    </main>

    <footer
      ref={props.captureRef}
      data-story-id="footer"
      data-component="Footer"
      style={{
        padding: "24px 32px",
        "text-align": "center",
        "font-size": "13px",
        color: "#999",
        "border-top": "1px solid #e5e5e5",
        "margin-top": "48px",
      }}
    >
      © 2025 Acme Inc. All rights reserved.
    </footer>
  </>
);
