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
