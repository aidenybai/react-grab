import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const REACT_GRAB_SCRIPT_TAG = `<script src="https://react-grab.com/script.js"></script>`;

const rewriteUrlsToAbsolute = (html: string, baseUrl: URL): string => {
  const origin = baseUrl.origin;
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, "/");

  return html
    .replace(/(href|src|action)="\/(?!\/)/g, `$1="${origin}/`)
    .replace(/(href|src|action)='\/(?!\/)/g, `$1='${origin}/`)
    .replace(/(href|src|action)="\.(?!\.)/g, `$1="${origin}${basePath}`)
    .replace(/(href|src|action)='\.(?!\.)/g, `$1='${origin}${basePath}`)
    .replace(/url\(["']?\/(?!\/)/g, `url("${origin}/`)
    .replace(/url\(["']?\.(?!\.)/g, `url("${origin}${basePath}`);
};

const injectReactGrabScript = (html: string): string => {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const headTag = headMatch[0];
    return html.replace(headTag, `${headTag}\n${REACT_GRAB_SCRIPT_TAG}`);
  }

  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch) {
    const htmlTag = htmlMatch[0];
    return html.replace(
      htmlTag,
      `${htmlTag}\n<head>${REACT_GRAB_SCRIPT_TAG}</head>`,
    );
  }

  return `${REACT_GRAB_SCRIPT_TAG}\n${html}`;
};

export const GET = async (request: NextRequest): Promise<Response> => {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response(
      JSON.stringify({
        error: "Missing url parameter",
        usage: "/proxy?url=https://example.com",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return new Response(
      JSON.stringify({ error: "Only HTTP and HTTPS URLs are supported" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReactGrabProxy/1.0; +https://react-grab.com)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isHtml = contentType.includes("text/html");

    if (!isHtml) {
      return new Response(
        JSON.stringify({
          error: "URL does not return HTML content",
          contentType,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let html = await response.text();

    html = rewriteUrlsToAbsolute(html, parsedUrl);
    html = injectReactGrabScript(html);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Proxied-From": targetUrl,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to proxy URL: ${errorMessage}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
