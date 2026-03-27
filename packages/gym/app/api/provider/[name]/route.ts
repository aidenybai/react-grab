import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";

const PROVIDER_MAP: Record<string, string> = {
  mcp: "mcp",
};

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> => {
  const { name } = await params;
  const packageDir = PROVIDER_MAP[name];

  if (!packageDir) {
    return new NextResponse("Provider not found", { status: 404 });
  }

  const scriptPath = join(
    process.cwd(),
    "..",
    packageDir,
    "dist",
    "client.global.js",
  );

  try {
    const content = await readFile(scriptPath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new NextResponse("Script not found", { status: 404 });
  }
};
