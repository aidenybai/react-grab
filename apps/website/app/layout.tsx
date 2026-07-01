import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Script from "next/script";
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

const description = "Copy any UI element for your agent";

export const metadata: Metadata = {
  title: "React Grab",
  description,
  icons: {
    icon: "https://react-grab.com/logo.png",
    shortcut: "https://react-grab.com/logo.png",
    apple: "https://react-grab.com/logo.png",
  },
  openGraph: {
    images: "https://react-grab.com/banner.png",
    title: "React Grab",
    description,
    url: "https://react-grab.com",
    siteName: "React Grab",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "React Grab",
    description,
    images: "https://react-grab.com/banner.png",
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} antialiased`}
      >
        {/* beforeInteractive (not defer) so bippy's devtools hook installs
            before React initializes. React only emits commit events to a hook
            present at init, and the render-history recorder relies on those
            commits — a deferred script loads too late and records nothing. */}
        <Script src="/script.js" strategy="beforeInteractive" />
        <NuqsAdapter>{children}</NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
};

RootLayout.displayName = "RootLayout";

export default RootLayout;
