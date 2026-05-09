import { NextResponse, type NextRequest } from "next/server";

const AGENT_UA_PATTERNS: RegExp[] = [
  /ChatGPT/i,
  /OAI-SearchBot/i,
  /OpenAI/i,
  /GPTBot/i,
  /Anthropic/i,
  /Claude/i,
  /Perplexity/i,
  /Cursor/i,
  /Cohere/i,
  /CCBot/i,
  /Bytespider/i,
  /Amazonbot/i,
  /Applebot-Extended/i,
  /Diffbot/i,
  /YouBot/i,
  /MistralAI/i,
  /OpenCode/i,
  /aider/i,
  /CodexCLI/i,
];

const PAGE_TO_MD: Record<string, string> = {
  "/": "/index.md",
  "/privacy": "/privacy.md",
  "/changelog": "/changelog.md",
};

const STATIC_ASSET_PATTERN = /\.(png|jpg|jpeg|svg|webp|ico|js|css|map|txt|xml|woff2?|ttf)$/i;

const isAgentUserAgent = (userAgent: string): boolean =>
  AGENT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));

const wantsMarkdown = (request: NextRequest): boolean => {
  const accept = request.headers.get("accept") ?? "";
  if (accept.toLowerCase().includes("text/markdown")) return true;
  const userAgent = request.headers.get("user-agent") ?? "";
  return isAgentUserAgent(userAgent);
};

export const proxy = (request: NextRequest): NextResponse => {
  const url = request.nextUrl.clone();
  const { hostname, pathname } = url;

  if (hostname.startsWith("www.")) {
    url.hostname = hostname.slice(4);
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/script.js" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname.endsWith(".md") ||
    pathname.endsWith(".txt") ||
    STATIC_ASSET_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!wantsMarkdown(request)) {
    const response = NextResponse.next();
    response.headers.append("Vary", "Accept, User-Agent");
    return response;
  }

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const markdownPath = PAGE_TO_MD[normalizedPath] ?? "/404.md";

  url.pathname = markdownPath;
  const rewritten = NextResponse.rewrite(url);
  rewritten.headers.append("Vary", "Accept, User-Agent");
  rewritten.headers.set("X-Robots-Tag", "noindex");
  return rewritten;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|script\\.js).*)"],
};
