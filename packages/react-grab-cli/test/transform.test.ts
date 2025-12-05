import { vi, describe, expect, it, beforeEach } from "vitest";
import { previewTransform, applyTransform } from "../src/transform.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("previewTransform - Next.js App Router", () => {
  const layoutContent = `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

  it("should add React Grab to layout.tsx", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("layout.tsx"));
    mockReadFileSync.mockReturnValue(layoutContent);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("layout.tsx");
    expect(result.newContent).toContain('import Script from "next/script"');
    expect(result.newContent).toContain("react-grab");
  });

  it("should add React Grab with agent to layout.tsx", () => {
    const layoutWithHead = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("layout.tsx"));
    mockReadFileSync.mockReturnValue(layoutWithHead);

    const result = previewTransform("/test", "next", "app", "cursor", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain("@react-grab/cursor");
  });

  it("should not duplicate if React Grab already exists", () => {
    const layoutWithReactGrab = `import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="//unpkg.com/react-grab/dist/index.global.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("layout.tsx"));
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should add agent to existing React Grab installation", () => {
    const layoutWithReactGrab = `import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("layout.tsx"));
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const result = previewTransform("/test", "next", "app", "cursor", true);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("@react-grab/cursor");
  });

  it("should fail when layout file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find");
  });
});

describe("previewTransform - Vite", () => {
  const indexContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  it("should add React Grab to index.html", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.html"));
    mockReadFileSync.mockReturnValue(indexContent);

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("import.meta.env.DEV");
  });

  it("should add React Grab with agent to index.html", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.html"));
    mockReadFileSync.mockReturnValue(indexContent);

    const result = previewTransform("/test", "vite", "unknown", "opencode", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain("@react-grab/opencode");
  });

  it("should add agent to existing React Grab installation", () => {
    const indexWithReactGrab = `<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      if (import.meta.env.DEV) {
        import("react-grab");
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.html"));
    mockReadFileSync.mockReturnValue(indexWithReactGrab);

    const result = previewTransform("/test", "vite", "unknown", "claude-code", true);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("@react-grab/claude-code");
  });
});

describe("previewTransform - Webpack", () => {
  const entryContent = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  it("should add React Grab to entry file", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.tsx"));
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "webpack", "unknown", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("process.env.NODE_ENV");
  });

  it("should add React Grab with agent to entry file", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("main.tsx"));
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "webpack", "unknown", "cursor", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain("@react-grab/cursor");
  });
});

describe("previewTransform - Unknown framework", () => {
  it("should fail for unknown framework", () => {
    const result = previewTransform("/test", "unknown", "unknown", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown framework");
  });
});

describe("applyTransform", () => {
  it("should write file when result has newContent", () => {
    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    applyTransform(result);

    expect(mockWriteFileSync).toHaveBeenCalledWith("/test/file.tsx", "new");
  });

  it("should not write file when result has no newContent", () => {
    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      noChanges: true,
    };

    applyTransform(result);

    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should not write file when result is not successful", () => {
    const result = {
      success: false,
      filePath: "",
      message: "Error",
    };

    applyTransform(result);

    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});
