import { join } from "path";
import { readdir } from "fs/promises";
import { startTunnel } from "untun";

const PORT = 3456;

const PACKAGES_DIR = join(import.meta.dir, "../packages");

const DIST_MAPPINGS: Record<string, string> = {
  "react-grab": join(PACKAGES_DIR, "react-grab/dist"),
  "react-grab-ami": join(PACKAGES_DIR, "react-grab-ami/dist"),
  "react-grab-cursor": join(PACKAGES_DIR, "react-grab-cursor/dist"),
  "react-grab-claude-code": join(PACKAGES_DIR, "react-grab-claude-code/dist"),
  "react-grab-opencode": join(PACKAGES_DIR, "react-grab-opencode/dist"),
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const getContentType = (filePath: string): string => {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    js: "application/javascript",
    cjs: "application/javascript",
    mjs: "application/javascript",
    ts: "application/typescript",
    cts: "application/typescript",
    mts: "application/typescript",
    css: "text/css",
    json: "application/json",
    html: "text/html",
    txt: "text/plain",
  };
  return contentTypes[extension ?? ""] ?? "application/octet-stream";
};

const listDirectoryContents = async (
  packageName: string,
  distPath: string
): Promise<string[]> => {
  const files = await readdir(distPath);
  return files.map((file) => `/${packageName}/${file}`);
};

const generateIndexHtml = async (baseUrl: string): Promise<string> => {
  const sections: string[] = [];

  for (const [packageName, distPath] of Object.entries(DIST_MAPPINGS)) {
    const files = await listDirectoryContents(packageName, distPath);
    const fileLinks = files
      .map(
        (file) =>
          `<li><a href="${file}"><code>${file}</code></a></li>`
      )
      .join("\n            ");
    sections.push(`
        <section>
          <h2>${packageName}</h2>
          <ul>
            ${fileLinks}
          </ul>
        </section>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>react-grab dist server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Geist', system-ui, -apple-system, sans-serif;
      background: #000;
      color: #e5e5e5;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #737373;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .subtitle a {
      color: #ff4fff;
      text-decoration: none;
      font-family: 'Geist Mono', monospace;
      background: rgba(255, 79, 255, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .subtitle a:hover {
      background: rgba(255, 79, 255, 0.2);
    }
    section {
      margin-bottom: 1.5rem;
    }
    h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: #a3a3a3;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    li a {
      display: block;
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.15s ease;
    }
    li a:hover {
      background: rgba(255, 79, 255, 0.08);
      border-color: rgba(255, 79, 255, 0.2);
    }
    li a code {
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      color: #d4d4d4;
    }
    li a:hover code {
      color: #ff4fff;
    }
    ::selection {
      background: rgba(215, 95, 203, 0.2);
      color: #d75fcb;
    }
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0d0d0d;
    }
    ::-webkit-scrollbar-thumb {
      background: #404040;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #525252;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>react-grab dist server</h1>
    <p class="subtitle">Serving at <a href="${baseUrl}">${baseUrl}</a></p>
    ${sections.join("")}
  </div>
</body>
</html>`;
};

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/" || pathname === "") {
      const html = await generateIndexHtml(`http://localhost:${PORT}`);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          ...NO_CACHE_HEADERS,
        },
      });
    }

    if (pathname === "/script.js") {
      const filePath = join(DIST_MAPPINGS["react-grab"], "index.global.js");
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: {
          "Content-Type": "application/javascript",
          "Access-Control-Allow-Origin": "*",
          ...NO_CACHE_HEADERS,
        },
      });
    }

    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      return new Response("Not Found", { status: 404, headers: NO_CACHE_HEADERS });
    }

    const [packageName, ...rest] = pathParts;
    const distPath = DIST_MAPPINGS[packageName];

    if (!distPath) {
      return new Response("Package not found", { status: 404, headers: NO_CACHE_HEADERS });
    }

    const filePath = join(distPath, ...rest);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return new Response("File not found", { status: 404, headers: NO_CACHE_HEADERS });
    }

    return new Response(file, {
      headers: {
        "Content-Type": getContentType(filePath),
        "Access-Control-Allow-Origin": "*",
        ...NO_CACHE_HEADERS,
      },
    });
  },
});

console.log(`Serving dist files at http://localhost:${server.port}`);

const tunnel = await startTunnel({
  port: PORT,
  acceptCloudflareNotice: true,
});

if (tunnel) {
  const tunnelUrl = await tunnel.getURL();
  console.log(`\n${tunnelUrl}`);

  process.on("SIGINT", async () => {
    await tunnel.close();
    process.exit(0);
  });
}
