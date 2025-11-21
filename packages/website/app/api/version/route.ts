import packageJson from "react-grab/package.json";

export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function GET() {
  return new Response(packageJson.version, {
    headers: corsHeaders,
  });
}

export function OPTIONS() {
  return new Response(null, {
    headers: corsHeaders,
  });
}
