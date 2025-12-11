import packageJson from "react-grab/package.json";

export const dynamic = "force-dynamic";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export function GET() {
  return new Response(packageJson.version, {
    headers,
  });
}

export function OPTIONS() {
  return new Response(null, {
    headers,
  });
}
