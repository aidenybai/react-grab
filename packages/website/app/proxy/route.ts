import { isBlockedDomain } from "./blocklist";

export const runtime = "edge";

const REACT_GRAB_SCRIPT = `<script src="https://react-grab.com/script.js"></script>`;

const createErrorResponse = (message: string, status: number): Response => {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proxy Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #fafafa;
    }
    .error {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; margin: 0; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Proxy Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
};

const rewriteHtml = (html: string, baseUrl: string): string => {
  const baseUrlObj = new URL(baseUrl);
  const baseOrigin = baseUrlObj.origin;

  let result = html;

  // Remove any existing <base> tag to prevent conflicts
  result = result.replace(
    /<base[^>]*>/gi,
    "<!-- base tag removed by proxy -->",
  );

  // Create injection: <base> tag + React Grab script
  // The <base> tag makes all relative URLs resolve to the original domain
  // This is much simpler than rewriting all URLs and works with dynamic imports
  const injection = `<base href="${baseOrigin}/">\n${REACT_GRAB_SCRIPT}`;

  // Inject into <head>
  const headMatch = result.match(/<head[^>]*>/i);
  if (headMatch) {
    const headEndIndex = headMatch.index! + headMatch[0].length;
    result =
      result.slice(0, headEndIndex) +
      "\n" +
      injection +
      "\n" +
      result.slice(headEndIndex);
  } else {
    // No <head> tag, inject after <html> or at the start
    const htmlMatch = result.match(/<html[^>]*>/i);
    if (htmlMatch) {
      const htmlEndIndex = htmlMatch.index! + htmlMatch[0].length;
      result =
        result.slice(0, htmlEndIndex) +
        "\n<head>\n" +
        injection +
        "\n</head>\n" +
        result.slice(htmlEndIndex);
    } else {
      result = injection + "\n" + result;
    }
  }

  return result;
};

export const GET = async (request: Request): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const targetUrl = requestUrl.searchParams.get("url");

  if (!targetUrl) {
    return createErrorResponse(
      "Missing 'url' parameter. Usage: /proxy?url=https://example.com",
      400,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return createErrorResponse("Invalid URL provided.", 400);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return createErrorResponse("Only HTTP and HTTPS URLs are supported.", 400);
  }

  if (isBlockedDomain(parsedUrl.hostname)) {
    return createErrorResponse("This domain is not allowed.", 403);
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          request.headers.get("User-Agent") ||
          "Mozilla/5.0 (compatible; ReactGrabProxy/1.0)",
        Accept: request.headers.get("Accept") || "*/*",
        "Accept-Language":
          request.headers.get("Accept-Language") || "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return createErrorResponse(
        `Failed to fetch: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const contentType = response.headers.get("Content-Type") || "";
    const isHtml = contentType.includes("text/html");

    // For HTML, inject <base> tag and React Grab script
    if (isHtml) {
      const html = await response.text();
      const transformedHtml = rewriteHtml(html, targetUrl);

      return new Response(transformedHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Proxied-From": targetUrl,
        },
      });
    }

    // For non-HTML content, return error (proxy only handles HTML pages)
    return createErrorResponse(
      "This proxy only handles HTML pages. For assets, use the original URL.",
      400,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(`Proxy error: ${message}`, 500);
  }
};
