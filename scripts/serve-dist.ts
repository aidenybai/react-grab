import { join } from "path";
import { readdir, stat } from "fs/promises";

const PORT = 3456;

const PACKAGES_DIR = join(import.meta.dir, "../packages");

const DIST_MAPPINGS: Record<string, string> = {
  "react-grab": join(PACKAGES_DIR, "react-grab/dist"),
  "react-grab-ami": join(PACKAGES_DIR, "react-grab-ami/dist"),
  "react-grab-cursor": join(PACKAGES_DIR, "react-grab-cursor/dist"),
  "react-grab-claude-code": join(PACKAGES_DIR, "react-grab-claude-code/dist"),
  "react-grab-opencode": join(PACKAGES_DIR, "react-grab-opencode/dist"),
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

const generateIndexHtml = async (): Promise<string> => {
  const sections: string[] = [];

  for (const [packageName, distPath] of Object.entries(DIST_MAPPINGS)) {
    const files = await listDirectoryContents(packageName, distPath);
    const fileLinks = files
      .map((file) => `<li><a href="${file}">${file}</a></li>`)
      .join("\n        ");
    sections.push(`
    <section>
      <h2>${packageName}</h2>
      <ul>
        ${fileLinks}
      </ul>
    </section>`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <title>react-grab dist server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 2rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>react-grab dist server</h1>
  <p>Serving dist files on port ${PORT}</p>
  ${sections.join("")}
</body>
</html>`;
};

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/" || pathname === "") {
      const html = await generateIndexHtml();
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      return new Response("Not Found", { status: 404 });
    }

    const [packageName, ...rest] = pathParts;
    const distPath = DIST_MAPPINGS[packageName];

    if (!distPath) {
      return new Response("Package not found", { status: 404 });
    }

    const filePath = join(distPath, ...rest);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(file, {
      headers: {
        "Content-Type": getContentType(filePath),
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});

console.log(`Serving dist files at http://localhost:${server.port}`);
