import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const filePath = join(process.cwd(), "e2e", "bench-results.json");
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "No benchmark results found" },
      { status: 404 },
    );
  }
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  return NextResponse.json(data);
}
