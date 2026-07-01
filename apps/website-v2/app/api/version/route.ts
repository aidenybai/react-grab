import packageJson from "react-grab/package.json";
import { getCorsHeaders, createOptionsResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const corsOptions = { methods: "*" as const, headers: "*" as const };

export const GET = (): Response => {
  return new Response(packageJson.version, {
    headers: {
      ...getCorsHeaders(corsOptions),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
};

export const OPTIONS = (): Response => createOptionsResponse(corsOptions);
