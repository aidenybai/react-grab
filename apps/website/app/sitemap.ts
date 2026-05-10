import type { MetadataRoute } from "next";
import { join } from "path";
import { discoverPageRoutes } from "@/utils/discover-page-routes";

const BASE_URL = "https://react-grab.com";

const sitemap = (): MetadataRoute.Sitemap => {
  const appDirectory = join(process.cwd(), "app");
  const routes = discoverPageRoutes(appDirectory);

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

    sitemapEntries.push({
      url: `${BASE_URL}/${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: isTopLevel ? 0.8 : 0.6,
    });
  }

  return sitemapEntries;
};

export default sitemap;
