import { getCorsHeaders, createOptionsResponse } from "@/lib/api-helpers";

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

const corsOptions = {
  methods: ["POST", "OPTIONS"] as const,
  headers: "*" as const,
};

export const POST = async (request: Request): Promise<Response> => {
  let payload: ReportPayload;

  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: getCorsHeaders(corsOptions),
    });
  }

  console.log(
    `[CLI Report] ${payload.type}:`,
    JSON.stringify(payload, null, 2),
  );

  return new Response("OK", { headers: getCorsHeaders(corsOptions) });
};

export const OPTIONS = (): Response => createOptionsResponse(corsOptions);
