import { readdirSync, statSync } from "fs";
import { join } from "path";

export const SITEMAP_EXCLUDED_PATHS = new Set(["api", "open-file"]);

export const discoverPageRoutes = (directory: string, basePath = ""): string[] => {
  const routes: string[] = [];
  const entries = readdirSync(directory);

  for (const entry of entries) {
    if (SITEMAP_EXCLUDED_PATHS.has(entry)) continue;
    if (entry.includes(".")) continue;

    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (!stat.isDirectory()) continue;

    const routePath = basePath ? `${basePath}/${entry}` : entry;
    const dirEntries = readdirSync(fullPath);
    const hasPage = dirEntries.some((file) => file === "page.tsx" || file === "page.ts");

    if (hasPage) {
      routes.push(routePath);
    }
    routes.push(...discoverPageRoutes(fullPath, routePath));
  }

  return routes;
};
