type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

interface CorsHeadersOptions {
  methods?: readonly HttpMethod[] | HttpMethod[] | "*";
  headers?: readonly string[] | string[] | "*";
  origin?: string;
}

export const getCorsHeaders = (
  options: CorsHeadersOptions = {},
): Record<string, string> => {
  const {
    methods = ["GET", "OPTIONS"],
    headers = ["Content-Type"],
    origin = "*",
  } = options;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods === "*" ? "*" : methods.join(", "),
    "Access-Control-Allow-Headers": headers === "*" ? "*" : headers.join(", "),
  };
};

export const createOptionsResponse = (
  corsOptions?: CorsHeadersOptions,
): Response => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(corsOptions),
  });
};

export const createJsonResponse = (
  data: unknown,
  options: { status?: number; corsOptions?: CorsHeadersOptions } = {},
): Response => {
  const { status = 200, corsOptions } = options;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(corsOptions),
      "Content-Type": "application/json",
    },
  });
};

export const createErrorResponse = (
  error: unknown,
  options: { status?: number; corsOptions?: CorsHeadersOptions } = {},
): Response => {
  const { status = 500, corsOptions } = options;
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return createJsonResponse({ error: errorMessage }, { status, corsOptions });
};
