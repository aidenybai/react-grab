import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const REACT_GRAB_SCRIPT_URL = "https://react-grab.com/script.js";

const resolveUrl = (href: string, baseUrl: URL): string | null => {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }

  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
};

const rewriteLinksToProxy = (
  html: string,
  baseUrl: URL,
  proxyBaseUrl: string,
): string => {
  html = html.replace(
    /<a\s+([^>]*?)href=(["'])([^"']*?)\2([^>]*?)>/gi,
    (match, before, quote, href, after) => {
      const resolvedUrl = resolveUrl(href, baseUrl);
      if (!resolvedUrl) {
        return match;
      }
      const proxyUrl = `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUrl)}`;
      return `<a ${before}href=${quote}${proxyUrl}${quote}${after}>`;
    },
  );

  html = html.replace(
    /<form\s+([^>]*?)action=(["'])([^"']*?)\2([^>]*?)>/gi,
    (match, before, quote, action, after) => {
      const resolvedUrl = resolveUrl(action, baseUrl);
      if (!resolvedUrl) {
        return match;
      }
      const proxyUrl = `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUrl)}`;
      return `<form ${before}action=${quote}${proxyUrl}${quote}${after}>`;
    },
  );

  html = html.replace(
    /<meta\s+([^>]*?)http-equiv=(["'])refresh\2([^>]*?)content=(["'])([^"']*?)\4([^>]*?)>/gi,
    (match, before1, quote1, middle, quote2, content, after) => {
      const urlMatch = content.match(/url=(.+)/i);
      if (!urlMatch) {
        return match;
      }
      const resolvedUrl = resolveUrl(urlMatch[1].trim(), baseUrl);
      if (!resolvedUrl) {
        return match;
      }
      const proxyUrl = `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUrl)}`;
      const newContent = content.replace(/url=.+/i, `url=${proxyUrl}`);
      return `<meta ${before1}http-equiv=${quote1}refresh${quote1}${middle}content=${quote2}${newContent}${quote2}${after}>`;
    },
  );

  return html;
};

const injectBaseTagAndScript = (html: string, baseHref: string): string => {
  const baseTag = `<base href="${baseHref}">`;
  const scriptTag = `<script src="${REACT_GRAB_SCRIPT_URL}"></script>`;
  const injection = `${baseTag}\n${scriptTag}`;

  const existingBaseMatch = html.match(/<base[^>]*>/i);
  if (existingBaseMatch) {
    html = html.replace(existingBaseMatch[0], baseTag);
    const headMatch = html.match(/<head[^>]*>/i);
    if (headMatch) {
      return html.replace(headMatch[0], `${headMatch[0]}\n${scriptTag}`);
    }
    return html;
  }

  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    return html.replace(headMatch[0], `${headMatch[0]}\n${injection}`);
  }

  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch) {
    return html.replace(
      htmlMatch[0],
      `${htmlMatch[0]}\n<head>${injection}</head>`,
    );
  }

  return `<head>${injection}</head>\n${html}`;
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

    const proxyBaseUrl = new URL("/proxy", request.url).href;
    html = rewriteLinksToProxy(html, parsedUrl, proxyBaseUrl);

    const baseHref =
      parsedUrl.origin + parsedUrl.pathname.replace(/\/[^/]*$/, "/");
    html = injectBaseTagAndScript(html, baseHref);

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
