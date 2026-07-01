import { readFile } from "fs/promises";
import { createRequire } from "module";
import { dirname, join } from "path";
import { getCorsHeaders } from "@/lib/api-helpers";

const require = createRequire(import.meta.url);
const nextProjectPathToken = "[project]";
const workspaceRoot = join(process.cwd(), "../..");

export const GET = async () => {
  const resolvedPackageJson = require
    .resolve("react-grab/package.json")
    .replace(nextProjectPathToken, workspaceRoot);
  const packageDirectory = dirname(resolvedPackageJson);
  const script = await readFile(join(packageDirectory, "dist/index.global.js"), "utf-8");
  return new Response(script, {
    headers: {
      // Loaded cross-origin as a CDN (consumer sites use `?cdn=react-grab.com`
      // with crossOrigin="anonymous"), so CORS + revalidate headers are required.
      ...getCorsHeaders(),
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
