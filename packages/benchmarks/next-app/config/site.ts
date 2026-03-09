export const siteConfig = {
  name: "Acme Dashboard",
  description: "Enterprise analytics and management platform for modern teams.",
  url: "https://app.acme.dev",
  ogImage: "https://app.acme.dev/og.png",
  links: {
    github: "https://github.com/acme/dashboard",
    docs: "https://docs.acme.dev",
    twitter: "https://twitter.com/acmedev",
    discord: "https://discord.gg/acme",
  },
  creator: "Acme Inc.",
  keywords: [
    "dashboard",
    "analytics",
    "enterprise",
    "management",
    "nextjs",
    "react",
    "tailwind",
  ],
};

export const siteMetadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@acmedev",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export type SiteConfig = typeof siteConfig;
