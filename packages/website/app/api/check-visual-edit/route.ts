import { createOptionsResponse, createJsonResponse } from "@/lib/api-helpers";

const corsOptions = { methods: ["GET", "OPTIONS"] as const };

export const OPTIONS = (): Response => createOptionsResponse(corsOptions);

export const GET = (): Response =>
  createJsonResponse({ healthy: true }, { corsOptions });
