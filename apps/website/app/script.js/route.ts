import { readFile } from "fs/promises";
import { join } from "path";
import { getCorsHeaders } from "@/lib/api-helpers";

const scriptPath = join(process.cwd(), "../../packages/react-grab/dist/index.global.js");

export const GET = async () => {
  const script = await readFile(scriptPath, "utf-8");
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
