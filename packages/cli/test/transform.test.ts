import { vi, describe, expect, it, beforeEach } from "vitest";
import {
  previewTransform,
  applyTransform,
  previewPackageJsonTransform,
  applyPackageJsonTransform,
} from "../src/utils/transform.js";

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
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutContent);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("layout.tsx");
    expect(result.newContent).toContain('import Script from "next/script"');
    expect(result.newContent).toContain("react-grab");
  });

  it("should add React Grab with agent to layout.tsx (no provider package)", () => {
    const layoutWithHead = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithHead);

    const result = previewTransform("/test", "next", "app", "mcp", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).not.toContain("@react-grab/");
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

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should add base script without agent client when agent is mcp", () => {
    const layoutWithHead = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithHead);

    const result = previewTransform("/test", "next", "app", "mcp", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).not.toContain("@react-grab/mcp");
  });

  it("should fail when layout file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "next", "app", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find");
  });
});

describe("previewTransform - Vite", () => {
  const entryContent = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  it("should add React Grab to entry file", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("main.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("import.meta.env.DEV");
  });

  it("should add React Grab with agent to entry file (no provider package)", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("main.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "vite", "unknown", "mcp", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).not.toContain("@react-grab/");
  });

  it("should add base script without agent client when agent is mcp", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("main.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "vite", "unknown", "mcp", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).not.toContain("@react-grab/mcp");
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
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform(
      "/test",
      "webpack",
      "unknown",
      "none",
      false,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("process.env.NODE_ENV");
  });

  it("should add React Grab with agent to entry file (no provider package)", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("main.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform(
      "/test",
      "webpack",
      "unknown",
      "mcp",
      false,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).not.toContain("@react-grab/");
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

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("_document.tsx"),
    );
    mockReadFileSync.mockReturnValue(documentContent);

    const result = previewTransform("/test", "next", "pages", "none", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain('import Script from "next/script"');
  });
});

describe("previewTransform - Vite edge cases", () => {
  it("should fail when entry file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find entry file");
  });

  it("should detect existing React Grab in index.html as already installed", () => {
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

    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.endsWith("index.html") || pathStr.endsWith("main.tsx");
    });
    mockReadFileSync.mockImplementation((path) => {
      if (String(path).endsWith("index.html")) return indexWithReactGrab;
      return `import React from "react";`;
    });

    const result = previewTransform("/test", "vite", "unknown", "none", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });
});

describe("previewTransform - Webpack edge cases", () => {
  it("should fail when entry file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform(
      "/test",
      "webpack",
      "unknown",
      "none",
      false,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find entry file");
  });
});

describe("previewTransform - Unknown framework", () => {
  it("should fail for unknown framework", () => {
    const result = previewTransform(
      "/test",
      "unknown",
      "unknown",
      "none",
      false,
    );

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
  it("should skip when agent is none", () => {
    const result = previewPackageJsonTransform("/test", "none", []);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should skip package.json when agent is mcp", () => {
    const result = previewPackageJsonTransform("/test", "mcp", []);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
    expect(result.message).toContain("MCP");
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
