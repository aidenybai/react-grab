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

const resolveUrl = (base: string, relative: string): string => {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
};

const createProxyUrl = (targetUrl: string, proxyBase: string): string => {
  return `${proxyBase}?url=${encodeURIComponent(targetUrl)}`;
};

const rewriteHtml = (
  html: string,
  baseUrl: string,
  proxyBaseUrl: string,
): string => {
  const baseUrlObj = new URL(baseUrl);
  const baseOrigin = baseUrlObj.origin;
  const basePath = baseUrlObj.pathname.replace(/[^/]*$/, "");

  let result = html;

  // Inject React Grab script into <head>
  const headMatch = result.match(/<head[^>]*>/i);
  if (headMatch) {
    const headEndIndex = headMatch.index! + headMatch[0].length;
    result =
      result.slice(0, headEndIndex) +
      "\n" +
      REACT_GRAB_SCRIPT +
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
        REACT_GRAB_SCRIPT +
        "\n</head>\n" +
        result.slice(htmlEndIndex);
    } else {
      result = REACT_GRAB_SCRIPT + "\n" + result;
    }
  }

  // Rewrite URLs in HTML attributes
  // Handle: href, src, action, data, poster, srcset
  const urlAttributes = ["href", "src", "action", "data", "poster"];

  for (const attr of urlAttributes) {
    // Match attribute with double quotes
    const doubleQuoteRegex = new RegExp(`(${attr}\\s*=\\s*")([^"]+)(")`, "gi");
    result = result.replace(doubleQuoteRegex, (match, prefix, url, suffix) => {
      const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
      return prefix + rewrittenUrl + suffix;
    });

    // Match attribute with single quotes
    const singleQuoteRegex = new RegExp(`(${attr}\\s*=\\s*')([^']+)(')`, "gi");
    result = result.replace(singleQuoteRegex, (match, prefix, url, suffix) => {
      const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
      return prefix + rewrittenUrl + suffix;
    });
  }

  // Handle srcset (contains multiple URLs with descriptors)
  const srcsetDoubleRegex = /(srcset\s*=\s*")([^"]+)(")/gi;
  result = result.replace(
    srcsetDoubleRegex,
    (match, prefix, srcset, suffix) => {
      const rewrittenSrcset = rewriteSrcset(
        srcset,
        baseOrigin,
        basePath,
        proxyBaseUrl,
      );
      return prefix + rewrittenSrcset + suffix;
    },
  );

  const srcsetSingleRegex = /(srcset\s*=\s*')([^']+)(')/gi;
  result = result.replace(
    srcsetSingleRegex,
    (match, prefix, srcset, suffix) => {
      const rewrittenSrcset = rewriteSrcset(
        srcset,
        baseOrigin,
        basePath,
        proxyBaseUrl,
      );
      return prefix + rewrittenSrcset + suffix;
    },
  );

  // Rewrite inline style url() references
  const styleUrlRegex = /(url\s*\(\s*)(['"]?)([^)'"]+)(\2\s*\))/gi;
  result = result.replace(
    styleUrlRegex,
    (match, prefix, quote, url, suffix) => {
      if (url.startsWith("data:")) return match;
      const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
      return prefix + quote + rewrittenUrl + quote + ")";
    },
  );

  // Remove or neutralize <base> tag to prevent it from interfering
  result = result.replace(
    /<base[^>]*>/gi,
    "<!-- base tag removed by proxy -->",
  );

  return result;
};

const rewriteUrl = (
  url: string,
  baseOrigin: string,
  basePath: string,
  proxyBaseUrl: string,
): string => {
  const trimmedUrl = url.trim();

  // Skip data URIs, javascript:, mailto:, tel:, and anchors
  if (
    trimmedUrl.startsWith("data:") ||
    trimmedUrl.startsWith("javascript:") ||
    trimmedUrl.startsWith("mailto:") ||
    trimmedUrl.startsWith("tel:") ||
    trimmedUrl.startsWith("#") ||
    trimmedUrl === ""
  ) {
    return url;
  }

  let absoluteUrl: string;

  if (trimmedUrl.startsWith("//")) {
    // Protocol-relative URL
    absoluteUrl = "https:" + trimmedUrl;
  } else if (trimmedUrl.startsWith("/")) {
    // Root-relative URL
    absoluteUrl = baseOrigin + trimmedUrl;
  } else if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://")
  ) {
    // Already absolute
    absoluteUrl = trimmedUrl;
  } else {
    // Relative URL
    absoluteUrl = resolveUrl(baseOrigin + basePath, trimmedUrl);
  }

  return createProxyUrl(absoluteUrl, proxyBaseUrl);
};

const rewriteSrcset = (
  srcset: string,
  baseOrigin: string,
  basePath: string,
  proxyBaseUrl: string,
): string => {
  return srcset
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length === 0) return entry;

      const url = parts[0];
      const descriptor = parts.slice(1).join(" ");

      const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);

      return descriptor ? `${rewrittenUrl} ${descriptor}` : rewrittenUrl;
    })
    .join(", ");
};

const rewriteCss = (
  css: string,
  baseUrl: string,
  proxyBaseUrl: string,
): string => {
  const baseUrlObj = new URL(baseUrl);
  const baseOrigin = baseUrlObj.origin;
  const basePath = baseUrlObj.pathname.replace(/[^/]*$/, "");

  let result = css;

  // Rewrite url() references
  const urlRegex = /(url\s*\(\s*)(['"]?)([^)'"]+)(\2\s*\))/gi;
  result = result.replace(urlRegex, (match, prefix, quote, url, suffix) => {
    if (url.startsWith("data:")) return match;
    const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
    return prefix + quote + rewrittenUrl + quote + ")";
  });

  // Rewrite @import urls
  const importRegex = /(@import\s+)(['"])([^'"]+)(\2)/gi;
  result = result.replace(importRegex, (match, prefix, quote, url, suffix) => {
    const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
    return prefix + quote + rewrittenUrl + suffix;
  });

  // Rewrite @import url()
  const importUrlRegex = /(@import\s+url\s*\(\s*)(['"]?)([^)'"]+)(\2\s*\))/gi;
  result = result.replace(
    importUrlRegex,
    (match, prefix, quote, url, suffix) => {
      const rewrittenUrl = rewriteUrl(url, baseOrigin, basePath, proxyBaseUrl);
      return prefix + quote + rewrittenUrl + quote + ")";
    },
  );

  return result;
};

export const GET = async (request: Request): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const targetUrl = requestUrl.searchParams.get("url");
  const proxyBaseUrl = `${requestUrl.origin}/proxy`;

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
    const isCss = contentType.includes("text/css");

    // For HTML, transform and inject React Grab
    if (isHtml) {
      const html = await response.text();
      const transformedHtml = rewriteHtml(html, targetUrl, proxyBaseUrl);

      return new Response(transformedHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Proxied-From": targetUrl,
        },
      });
    }

    // For CSS, rewrite url() references
    if (isCss) {
      const css = await response.text();
      const transformedCss = rewriteCss(css, targetUrl, proxyBaseUrl);

      return new Response(transformedCss, {
        status: 200,
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "X-Proxied-From": targetUrl,
        },
      });
    }

    // For other content types, pass through as-is
    const responseHeaders = new Headers();
    responseHeaders.set("X-Proxied-From", targetUrl);

    // Preserve important headers
    const headersToPreserve = [
      "Content-Type",
      "Cache-Control",
      "Content-Encoding",
    ];

    for (const header of headersToPreserve) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResponse(`Proxy error: ${message}`, 500);
  }
};
