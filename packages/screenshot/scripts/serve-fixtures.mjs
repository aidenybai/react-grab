import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const serverPort = Number(process.env.PORT);
if (!Number.isInteger(serverPort) || serverPort <= 0) {
  console.error("PORT environment variable must be a positive integer");
  process.exit(1);
}
const fixturesRootPath = fileURLToPath(new URL("../e2e/fixtures", import.meta.url));

const MIME_TYPES_BY_EXTENSION = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://localhost:${serverPort}`);
  const decodedPathname = decodeURIComponent(requestUrl.pathname);
  const resolvedFilePath = resolve(fixturesRootPath, `.${decodedPathname}`);

  const isInsideFixturesRoot =
    resolvedFilePath === fixturesRootPath ||
    resolvedFilePath.startsWith(`${fixturesRootPath}${sep}`);
  if (!isInsideFixturesRoot) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("forbidden");
    return;
  }

  try {
    const fileContents = await readFile(resolvedFilePath);
    const contentType =
      MIME_TYPES_BY_EXTENSION[extname(resolvedFilePath).toLowerCase()] ??
      "application/octet-stream";
    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    });
    response.end(fileContents);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
});

server.listen(serverPort, () => {
  console.log(`fixture server listening on http://localhost:${serverPort}`);
});
