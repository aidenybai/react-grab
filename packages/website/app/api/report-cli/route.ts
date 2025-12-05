const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

interface ReportPayload {
  type: "error" | "completed";
  version: string;
  config?: {
    framework: string;
    packageManager: string;
    router?: string;
    agent?: string;
    isMonorepo: boolean;
  };
  error?: {
    message: string;
    stack?: string;
  };
  timestamp: string;
}

export async function POST(request: Request) {
  const payload: ReportPayload = await request.json();

  console.log(`[CLI Report] ${payload.type}:`, JSON.stringify(payload, null, 2));

  return new Response("OK", { headers });
}

export function OPTIONS() {
  return new Response(null, { headers });
}
