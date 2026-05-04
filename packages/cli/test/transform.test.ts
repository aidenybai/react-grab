import { vi, describe, expect, it, beforeEach } from "vite-plus/test";
import { previewTransform, applyTransform } from "../src/utils/transform.js";

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

    const result = previewTransform("/test", "next", "app", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("layout.tsx");
    expect(result.newContent).toContain('import Script from "next/script"');
    expect(result.newContent).toContain("react-grab");
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

    const result = previewTransform("/test", "next", "app", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should fail when layout file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "next", "app", false);

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
    mockExistsSync.mockImplementation((path) => String(path).endsWith("main.tsx"));
    mockReadFileSync.mockReturnValue(entryContent);

    const result = previewTransform("/test", "vite", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("import.meta.env.DEV");
  });
});

describe("previewTransform - SvelteKit", () => {
  it("should create hooks.client.ts when no client hook exists", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("/src"));

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/test/src/hooks.client.ts");
    expect(result.originalContent).toBe("");
    expect(result.newContent).toContain('void import("react-grab")');
    expect(result.newContent).toContain("import.meta.env.DEV");
  });

  it("should add React Grab to an existing TypeScript client hook", () => {
    const hooksContent = `export const handleError = ({ error }) => {
  console.error(error);
};`;

    mockExistsSync.mockImplementation((path) => {
      const pathString = String(path);
      return pathString.endsWith("/src") || pathString.endsWith("hooks.client.ts");
    });
    mockReadFileSync.mockReturnValue(hooksContent);

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/test/src/hooks.client.ts");
    expect(result.newContent).toContain('void import("react-grab")');
    expect(result.newContent).toContain(hooksContent);
  });

  it("should add React Grab to an existing JavaScript client hook", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = String(path);
      return pathString.endsWith("/src") || pathString.endsWith("hooks.client.js");
    });
    mockReadFileSync.mockReturnValue("export const reroute = () => undefined;");

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/test/src/hooks.client.js");
    expect(result.newContent).toContain('void import("react-grab")');
  });

  it("should not duplicate if React Grab already exists in hooks.client", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = String(path);
      return pathString.endsWith("/src") || pathString.endsWith("hooks.client.ts");
    });
    mockReadFileSync.mockReturnValue(`if (import.meta.env.DEV) {
  void import("react-grab");
}`);

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should not duplicate if React Grab already exists in app.html", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = String(path);
      return pathString.endsWith("/src") || pathString.endsWith("app.html");
    });
    mockReadFileSync.mockReturnValue(`<html>
  <head><script src="/react-grab.js"></script></head>
  <body>%sveltekit.body%</body>
</html>`);

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
    expect(result.filePath).toBe("/test/src/app.html");
  });

  it("should fail when src directory is missing", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "sveltekit", "unknown", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find src/ directory");
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

    const result = previewTransform("/test", "webpack", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import("react-grab")');
    expect(result.newContent).toContain("process.env.NODE_ENV");
  });
});

describe("previewTransform - Next.js Pages Router", () => {
  it("should fail with helpful message when _document.tsx not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "next", "pages", false);

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

    const result = previewTransform("/test", "next", "pages", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain('import Script from "next/script"');
  });
});

describe("previewTransform - Vite edge cases", () => {
  it("should fail when entry file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "vite", "unknown", false);

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

    const result = previewTransform("/test", "vite", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });
});

describe("previewTransform - Webpack edge cases", () => {
  it("should fail when entry file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "webpack", "unknown", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find entry file");
  });
});

describe("previewTransform - TanStack Start", () => {
  const rootContent = `/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}`;

  it("should add React Grab to __root.tsx", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("__root.tsx"));
    mockReadFileSync.mockReturnValue(rootContent);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("__root.tsx");
    expect(result.newContent).toContain('import { useEffect } from "react"');
    expect(result.newContent).toContain("react-grab");
    expect(result.newContent).toContain("import.meta.env.DEV");
  });

  it("should add useEffect to existing react import", () => {
    const rootWithReactImport = `import { useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({ component: RootComponent });

function RootComponent() {
  return <Outlet />;
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("__root.tsx"));
    mockReadFileSync.mockReturnValue(rootWithReactImport);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("useState, useEffect");
    expect(result.newContent).not.toContain(
      'import { useEffect } from "react";\nimport { useState }',
    );
  });

  it("should not duplicate if React Grab already exists", () => {
    const rootWithReactGrab = `import { useEffect } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({ component: RootComponent });

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);
  return <Outlet />;
}`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("__root.tsx"));
    mockReadFileSync.mockReturnValue(rootWithReactGrab);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.noChanges).toBe(true);
  });

  it("should fail with helpful message when __root.tsx not found", () => {
    mockExistsSync.mockReturnValue(false);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find src/routes/__root.tsx");
    expect(result.message).toContain('import { useEffect } from "react"');
  });

  it("should fail when no component function found", () => {
    const rootWithoutComponent = `import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => <div>Hello</div>,
});`;

    mockExistsSync.mockImplementation((path) => String(path).endsWith("__root.tsx"));
    mockReadFileSync.mockReturnValue(rootWithoutComponent);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find a component function");
  });

  it("should not skip useEffect import when only type import from react exists", () => {
    mockExistsSync.mockImplementation((path) => String(path).endsWith("__root.tsx"));
    mockReadFileSync.mockReturnValue(rootContent);

    const result = previewTransform("/test", "tanstack", "unknown", false);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('import { useEffect } from "react"');
    expect(result.newContent).toContain('import type { ReactNode } from "react"');
  });
});

describe("previewTransform - Unknown framework", () => {
  it("should fail for unknown framework", () => {
    const result = previewTransform("/test", "unknown", "unknown", false);

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
