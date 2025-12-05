import { vi, describe, expect, it, beforeEach } from "vitest";
import { previewTransform, applyTransform, previewPackageJsonTransform, applyPackageJsonTransform } from "../src/transform.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  accessSync: vi.fn(),
  constants: { W_OK: 2 },
}));

import { existsSync, readFileSync, writeFileSync, accessSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockAccessSync = vi.mocked(accessSync);

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

  it("should add React Grab with codex agent to index.html", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.html"));
    mockReadFileSync.mockReturnValue(indexContent);

    const result = previewTransform("/test", "vite", "unknown", "codex", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain("@react-grab/codex");
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

describe("previewTransform - Next.js Pages Router", () => {
  it("should fail with helpful message when _document.tsx not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "next", "pages", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find pages/_document.tsx");
    expect(result.message).toContain("import { Html, Head, Main, NextScript }");
    expect(result.message).toContain("export default function Document()");
  });

  it("should add React Grab to existing _document.tsx", () => {
    const documentContent = `import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head></Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("_document.tsx"));
    mockReadFileSync.mockReturnValue(documentContent);

    const result = previewTransform("/test", "next", "pages", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain('import Script from "next/script"');
  });

  it("should add agent to existing Pages Router installation", () => {
    const documentWithReactGrab = `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html>
      <Head>
        <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("_document.tsx"));
    mockReadFileSync.mockReturnValue(documentWithReactGrab);

    const result = previewTransform("/test", "next", "pages", "cursor", true);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("@react-grab/cursor");
  });
});

describe("previewTransform - Vite edge cases", () => {
  it("should handle uppercase HEAD tag", () => {
    const indexContent = `<!doctype html>
<html lang="en">
  <HEAD>
    <meta charset="UTF-8" />
  </HEAD>
  <body>
    <div id="root"></div>
  </body>
</html>`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.html"));
    mockReadFileSync.mockReturnValue(indexContent);

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
  });

  it("should fail when index.html not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find index.html");
  });
});

describe("previewTransform - Webpack edge cases", () => {
  it("should fail when entry file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "webpack", "unknown", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find entry file");
  });

  it("should add agent to existing Webpack installation", () => {
    const entryWithReactGrab = `if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import React from "react";
import ReactDOM from "react-dom/client";`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("index.tsx"));
    mockReadFileSync.mockReturnValue(entryWithReactGrab);

    const result = previewTransform("/test", "webpack", "unknown", "opencode", true);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("@react-grab/opencode");
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
  it("should write file when result has newContent and file is writable", () => {
    mockAccessSync.mockImplementation(() => undefined);

    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledWith("/test/file.tsx", "new");
  });

  it("should return error when file is not writable", () => {
    mockAccessSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(false);
    expect(writeResult.error).toContain("Cannot write to");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should not write file when result has no newContent", () => {
    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      noChanges: true,
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should not write file when result is not successful", () => {
    const result = {
      success: false,
      filePath: "",
      message: "Error",
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should return error when writeFileSync throws", () => {
    mockAccessSync.mockImplementation(() => undefined);
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const result = {
      success: true,
      filePath: "/test/file.tsx",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(false);
    expect(writeResult.error).toContain("Failed to write to");
    expect(writeResult.error).toContain("Disk full");
  });

  it("should not write when filePath is empty", () => {
    const result = {
      success: true,
      filePath: "",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("previewPackageJsonTransform", () => {
  const packageJsonContent = JSON.stringify(
    {
      name: "my-app",
      scripts: {
        dev: "next dev --turbopack",
        build: "next build",
      },
    },
    null,
    2
  );

  it("should add agent prefix to dev script", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonContent);

    const result = previewPackageJsonTransform("/test", "cursor", []);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("npx @react-grab/cursor@latest &&");
    expect(result.newContent).toContain("next dev --turbopack");
  });

  it("should add claude-code prefix to dev script", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonContent);

    const result = previewPackageJsonTransform("/test", "claude-code", []);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("npx @react-grab/claude-code@latest &&");
  });

  it("should add opencode prefix to dev script", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonContent);

    const result = previewPackageJsonTransform("/test", "opencode", []);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("npx @react-grab/opencode@latest &&");
  });

  it("should add codex prefix to dev script", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonContent);

    const result = previewPackageJsonTransform("/test", "codex", []);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("npx @react-grab/codex@latest &&");
  });

  it("should skip when agent is none", () => {
    const result = previewPackageJsonTransform("/test", "none", []);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should not duplicate if agent is already configured", () => {
    const packageJsonWithAgent = JSON.stringify(
      {
        name: "my-app",
        scripts: {
          dev: "npx @react-grab/cursor@latest && next dev --turbopack",
        },
      },
      null,
      2
    );

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonWithAgent);

    const result = previewPackageJsonTransform("/test", "cursor", []);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should not add another agent if one is already installed", () => {
    const packageJsonWithAgent = JSON.stringify(
      {
        name: "my-app",
        scripts: {
          dev: "npx @react-grab/codex@latest && next dev",
        },
      },
      null,
      2
    );

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonWithAgent);

    const result = previewPackageJsonTransform("/test", "cursor", ["codex"]);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should fail when package.json not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewPackageJsonTransform("/test", "cursor", []);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find package.json");
  });

  it("should fail when no dev script exists", () => {
    const packageJsonNoDev = JSON.stringify(
      {
        name: "my-app",
        scripts: {
          build: "next build",
        },
      },
      null,
      2
    );

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(packageJsonNoDev);

    const result = previewPackageJsonTransform("/test", "cursor", []);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No "dev" script found');
  });

  it("should fail when package.json is invalid JSON", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{ invalid json }");

    const result = previewPackageJsonTransform("/test", "cursor", []);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed to parse package.json");
  });
});

describe("applyPackageJsonTransform", () => {
  it("should write file when result has newContent and file is writable", () => {
    vi.clearAllMocks();
    mockAccessSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);

    const result = {
      success: true,
      filePath: "/test/package.json",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyPackageJsonTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledWith("/test/package.json", "new");
  });

  it("should return error when file is not writable", () => {
    vi.clearAllMocks();
    mockAccessSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const result = {
      success: true,
      filePath: "/test/package.json",
      message: "Test",
      originalContent: "old",
      newContent: "new",
    };

    const writeResult = applyPackageJsonTransform(result);

    expect(writeResult.success).toBe(false);
    expect(writeResult.error).toContain("Cannot write to");
  });

  it("should not write file when result has noChanges", () => {
    vi.clearAllMocks();

    const result = {
      success: true,
      filePath: "/test/package.json",
      message: "Test",
      noChanges: true,
    };

    const writeResult = applyPackageJsonTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});
