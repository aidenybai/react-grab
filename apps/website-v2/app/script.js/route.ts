import { readFile } from "fs/promises";
import { createRequire } from "module";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);

export const GET = async () => {
  const packageDirectory = dirname(
    require.resolve("react-grab/package.json"),
  );
  const script = await readFile(
    join(packageDirectory, "dist/index.global.js"),
    "utf-8",
  );
  return new Response(script, {
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
};
