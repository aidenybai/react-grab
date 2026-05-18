import { NextResponse, type NextRequest } from "next/server";

const markdownPathname = "/llms.txt";
const markdownAcceptHeader = "text/markdown";
const varyHeader = "Accept";

export const proxy = (request: NextRequest) => {
  if (request.nextUrl.pathname === "/llm.txt") {
    const url = request.nextUrl.clone();
    url.pathname = markdownPathname;
    const response = NextResponse.rewrite(url);
    response.headers.set("Vary", varyHeader);

    return response;
  }

  const response = request.headers.get("accept")?.toLowerCase().includes(markdownAcceptHeader)
    ? NextResponse.rewrite(new URL(markdownPathname, request.url))
    : NextResponse.next({
        headers: {
          Vary: varyHeader,
        },
      });

  response.headers.set("Vary", varyHeader);

  return response;
};
