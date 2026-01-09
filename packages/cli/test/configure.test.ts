import { vi, describe, expect, it, beforeEach } from "vitest";
import {
  previewOptionsTransform,
  applyOptionsTransform,
  type ReactGrabOptions,
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

describe("previewOptionsTransform - Next.js App Router", () => {
  const layoutWithReactGrab = `import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  it("should add activationKey option to existing React Grab script", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Meta+K",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("data-options");
    expect(result.newContent).toContain("activationKey");
    expect(result.newContent).toContain("Meta+K");
  });

  it("should add multiple options to React Grab script", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Ctrl+Shift+G",
      activationMode: "toggle",
      keyHoldDuration: 200,
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("activationKey");
    expect(result.newContent).toContain("Ctrl+Shift+G");
    expect(result.newContent).toContain("activationMode");
    expect(result.newContent).toContain("toggle");
    expect(result.newContent).toContain("keyHoldDuration");
    expect(result.newContent).toContain("200");
  });

  it("should add allowActivationInsideInput option", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const options: ReactGrabOptions = {
      allowActivationInsideInput: false,
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("allowActivationInsideInput");
    expect(result.newContent).toContain("false");
  });

  it("should add maxContextLines option", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);

    const options: ReactGrabOptions = {
      maxContextLines: 5,
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("maxContextLines");
    expect(result.newContent).toContain("5");
  });

  it("should update existing data-options attribute", () => {
    const layoutWithOptions = `import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-options={JSON.stringify({ activationKey: "Alt" })}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithOptions);

    const options: ReactGrabOptions = {
      activationKey: "Meta+Space",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Meta+Space");
    expect(result.newContent).not.toContain('"Alt"');
  });

  it("should fail when React Grab is not found", () => {
    const layoutWithoutReactGrab = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithoutReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Meta+K",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find React Grab");
  });

  it("should fail when layout file not found", () => {
    mockExistsSync.mockReturnValue(false);

    const options: ReactGrabOptions = {
      activationKey: "Meta+K",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find file");
  });
});

describe("previewOptionsTransform - Next.js Pages Router", () => {
  const documentWithReactGrab = `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html>
      <Head>
        <Script
          src="//unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`;

  it("should add options to Pages Router document", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("_document.tsx"),
    );
    mockReadFileSync.mockReturnValue(documentWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Meta+G",
      activationMode: "hold",
    };

    const result = previewOptionsTransform("/test", "next", "pages", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("data-options");
    expect(result.newContent).toContain("Meta+G");
    expect(result.newContent).toContain("hold");
  });
});

describe("previewOptionsTransform - Vite", () => {
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
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  it("should add options to Vite import", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.html"),
    );
    mockReadFileSync.mockReturnValue(indexWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Space",
    };

    const result = previewOptionsTransform(
      "/test",
      "vite",
      "unknown",
      options,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("init(");
    expect(result.newContent).toContain('"activationKey":"Space"');
  });

  it("should add multiple options to Vite import", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.html"),
    );
    mockReadFileSync.mockReturnValue(indexWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Alt+E",
      activationMode: "toggle",
      maxContextLines: 10,
    };

    const result = previewOptionsTransform(
      "/test",
      "vite",
      "unknown",
      options,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain(".then((m) => m.init(");
    expect(result.newContent).toContain('"activationKey":"Alt+E"');
    expect(result.newContent).toContain('"activationMode":"toggle"');
    expect(result.newContent).toContain('"maxContextLines":10');
  });

  it("should fail when React Grab import not found", () => {
    const indexWithoutReactGrab = `<!doctype html>
<html lang="en">
  <head></head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.html"),
    );
    mockReadFileSync.mockReturnValue(indexWithoutReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Space",
    };

    const result = previewOptionsTransform(
      "/test",
      "vite",
      "unknown",
      options,
    );

    expect(result.success).toBe(false);
  });
});

describe("previewOptionsTransform - Webpack", () => {
  const entryWithReactGrab = `if (process.env.NODE_ENV === "development") {
  import("react-grab");
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  it("should add options to Webpack import", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Ctrl+K",
    };

    const result = previewOptionsTransform(
      "/test",
      "webpack",
      "unknown",
      options,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain(".then((m) => m.init(");
    expect(result.newContent).toContain('"activationKey":"Ctrl+K"');
  });

  it("should handle all configuration options", () => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("index.tsx"),
    );
    mockReadFileSync.mockReturnValue(entryWithReactGrab);

    const options: ReactGrabOptions = {
      activationKey: "Meta+Shift+D",
      activationMode: "hold",
      keyHoldDuration: 300,
      allowActivationInsideInput: true,
      maxContextLines: 7,
    };

    const result = previewOptionsTransform(
      "/test",
      "webpack",
      "unknown",
      options,
    );

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('"activationKey":"Meta+Shift+D"');
    expect(result.newContent).toContain('"activationMode":"hold"');
    expect(result.newContent).toContain('"keyHoldDuration":300');
    expect(result.newContent).toContain('"allowActivationInsideInput":true');
    expect(result.newContent).toContain('"maxContextLines":7');
  });
});

describe("previewOptionsTransform - Unknown framework", () => {
  it("should fail for unknown framework (no file found)", () => {
    mockExistsSync.mockReturnValue(false);

    const options: ReactGrabOptions = {
      activationKey: "Meta+K",
    };

    const result = previewOptionsTransform(
      "/test",
      "unknown",
      "unknown",
      options,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Could not find file");
  });
});

describe("applyOptionsTransform", () => {
  it("should write file when result has newContent and file is writable", () => {
    mockAccessSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);

    const result = {
      success: true,
      filePath: "/test/layout.tsx",
      message: "Update React Grab options",
      originalContent: "old content",
      newContent: "new content with options",
    };

    const writeResult = applyOptionsTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/test/layout.tsx",
      "new content with options",
    );
  });

  it("should return error when file is not writable", () => {
    mockAccessSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const result = {
      success: true,
      filePath: "/test/layout.tsx",
      message: "Update React Grab options",
      originalContent: "old content",
      newContent: "new content",
    };

    const writeResult = applyOptionsTransform(result);

    expect(writeResult.success).toBe(false);
    expect(writeResult.error).toContain("Cannot write to");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should not write file when result has noChanges", () => {
    const result = {
      success: true,
      filePath: "/test/layout.tsx",
      message: "No changes needed",
      noChanges: true,
    };

    const writeResult = applyOptionsTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should not write file when result is not successful", () => {
    const result = {
      success: false,
      filePath: "/test/layout.tsx",
      message: "Error",
    };

    const writeResult = applyOptionsTransform(result);

    expect(writeResult.success).toBe(true);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("Activation key formats", () => {
  const layoutWithReactGrab = `import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="//unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  beforeEach(() => {
    mockExistsSync.mockImplementation((path) =>
      String(path).endsWith("layout.tsx"),
    );
    mockReadFileSync.mockReturnValue(layoutWithReactGrab);
  });

  it("should handle simple key like Space", () => {
    const options: ReactGrabOptions = {
      activationKey: "Space",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Space");
  });

  it("should handle single letter key", () => {
    const options: ReactGrabOptions = {
      activationKey: "g",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain('"g"');
  });

  it("should handle modifier + key combo", () => {
    const options: ReactGrabOptions = {
      activationKey: "Meta+K",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Meta+K");
  });

  it("should handle multiple modifiers + key", () => {
    const options: ReactGrabOptions = {
      activationKey: "Ctrl+Shift+Alt+G",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Ctrl+Shift+Alt+G");
  });

  it("should handle function keys", () => {
    const options: ReactGrabOptions = {
      activationKey: "F1",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("F1");
  });

  it("should handle Escape key", () => {
    const options: ReactGrabOptions = {
      activationKey: "Escape",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Escape");
  });

  it("should handle Meta+Escape combo", () => {
    const options: ReactGrabOptions = {
      activationKey: "Meta+Escape",
    };

    const result = previewOptionsTransform("/test", "next", "app", options);

    expect(result.success).toBe(true);
    expect(result.newContent).toContain("Meta+Escape");
  });
});
