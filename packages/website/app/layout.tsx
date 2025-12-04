import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "React Grab",
  description:
    "Select an element → Give it to Cursor, Claude Code, etc → Make a change to your app",
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

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>{children}</NuqsAdapter>
        <Analytics />
        <Script
          src="//unpkg.com/@react-grab/cursor/dist/client.global.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
};

RootLayout.displayName = "RootLayout";

export default RootLayout;
