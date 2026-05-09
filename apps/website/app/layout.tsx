import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://react-grab.com"),
  title: "React Grab",
  description:
    "Select an element → Give it to Cursor, Claude Code, etc → Make a change to your app",
  alternates: {
    canonical: "https://react-grab.com",
    types: {
      "text/markdown": "https://react-grab.com/index.md",
    },
  },
  icons: {
    icon: "https://react-grab.com/logo.png",
    shortcut: "https://react-grab.com/logo.png",
    apple: "https://react-grab.com/logo.png",
  },
  openGraph: {
    images: "https://react-grab.com/banner.png",
    title: "React Grab",
    description:
      "Select an element → Give it to Cursor, Claude Code, etc → Make a change to your app",
    url: "https://react-grab.com",
    siteName: "React Grab",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "React Grab",
    description:
      "Select an element → Give it to Cursor, Claude Code, etc → Make a change to your app",
    images: "https://react-grab.com/banner.png",
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://react-grab.com/#website",
      url: "https://react-grab.com",
      name: "React Grab",
      description:
        "Select an element → Give it to Cursor, Claude Code, etc → Make a change to your app",
      inLanguage: "en-US",
      publisher: { "@id": "https://react-grab.com/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://react-grab.com/#organization",
      name: "React Grab",
      url: "https://react-grab.com",
      logo: "https://react-grab.com/logo.png",
      sameAs: ["https://github.com/aidenybai/react-grab"],
    },
    {
      "@type": "SoftwareApplication",
      name: "React Grab",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: "https://react-grab.com",
      description:
        "Open-source dev-only script that adds an element picker to React apps so you can copy file paths, components, and HTML source for AI coding agents.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="alternate"
          type="text/markdown"
          href="https://react-grab.com/llms.txt"
          title="llms.txt"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <script src="/script.js" defer />
        <NuqsAdapter>{children}</NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
};

RootLayout.displayName = "RootLayout";

export default RootLayout;
