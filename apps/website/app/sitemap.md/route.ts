import { join } from "path";
import { discoverPageRoutes } from "@/utils/discover-page-routes";

const BASE_URL = "https://react-grab.com";

interface SitemapEntry {
  url: string;
  title: string;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/changelog": "Changelog",
  "/privacy": "Privacy Policy",
};

export const dynamic = "force-static";

export const GET = (): Response => {
  const appDirectory = join(process.cwd(), "app");
  const routes = discoverPageRoutes(appDirectory);

  const entries: SitemapEntry[] = [{ url: BASE_URL, title: PAGE_TITLES["/"] ?? "Home" }];
  for (const route of routes) {
    const path = `/${route}`;
    entries.push({
      url: `${BASE_URL}${path}`,
      title: PAGE_TITLES[path] ?? route.charAt(0).toUpperCase() + route.slice(1),
    });
  }

  const lines: string[] = [];
  lines.push("# React Grab Sitemap");
  lines.push("");
  lines.push("> All public pages on react-grab.com, with markdown alternates.");
  lines.push("");
  lines.push("## Pages");
  lines.push("");
  for (const entry of entries) {
    const mdUrl = entry.url === BASE_URL ? `${BASE_URL}/index.md` : `${entry.url}.md`;
    lines.push(`- [${entry.title}](${entry.url}) — [markdown](${mdUrl})`);
  }
  lines.push("");
  lines.push("## Resources");
  lines.push("");
  lines.push(`- [llms.txt](${BASE_URL}/llms.txt)`);
  lines.push(`- [llms-full.txt](${BASE_URL}/llms-full.txt)`);
  lines.push(`- [Install guide](${BASE_URL}/install.md)`);
  lines.push(`- [sitemap.xml](${BASE_URL}/sitemap.xml)`);
  lines.push(`- [GitHub](https://github.com/aidenybai/react-grab)`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
};
