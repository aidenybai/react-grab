import type { MetadataRoute } from "next";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const BASE_URL = "https://react-grab.com";

const EXCLUDED_PATHS = new Set(["api", "open-file"]);

const getRoutes = (directory: string, basePath = ""): Array<string> => {
  const routes: Array<string> = [];
  const entries = readdirSync(directory);

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const routePath = basePath ? `${basePath}/${entry}` : entry;

    if (EXCLUDED_PATHS.has(entry)) {
      continue;
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const hasPage = readdirSync(fullPath).some(
        (file) => file === "page.tsx" || file === "page.ts"
      );

      if (hasPage) {
        routes.push(routePath);
      }

      routes.push(...getRoutes(fullPath, routePath));
    }
  }

  return routes;
};

const sitemap = (): MetadataRoute.Sitemap => {
  const appDirectory = join(process.cwd(), "app");
  const routes = getRoutes(appDirectory);

  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const route of routes) {
    const isTopLevel = !route.includes("/");
    const isBlogPost = route.startsWith("blog/") && route !== "blog";

    sitemapEntries.push({
      url: `${BASE_URL}/${route}`,
      lastModified: new Date(),
      changeFrequency: isBlogPost ? "monthly" : "weekly",
      priority: isTopLevel ? 0.8 : 0.6,
    });
  }

  return sitemapEntries;
};

export default sitemap;
