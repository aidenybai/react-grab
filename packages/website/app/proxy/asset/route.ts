import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

export const OPTIONS = (): Response => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const GET = async (request: NextRequest): Promise<Response> => {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return new Response(
      JSON.stringify({ error: "Only HTTP/HTTPS supported" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReactGrabProxy/1.0; +https://react-grab.com)",
        Accept: request.headers.get("accept") || "*/*",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
};
