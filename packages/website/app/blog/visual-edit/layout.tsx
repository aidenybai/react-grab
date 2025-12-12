import type { Metadata } from "next";

const title = "Visual Edit";
const description =
  "Click any part of your app, ask for a change, and see it happen in sub 20 seconds. Free through OpenCode Zen.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/blog/visual-edit",
    siteName: "React Grab",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `React Grab - ${title}`,
      },
    ],
    locale: "en_US",
    type: "article",
    authors: ["Aiden Bai", "Ben Maclaurin"],
    publishedTime: "2025-12-11T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
    creator: "@aidenybai",
  },
  alternates: {
    canonical: "https://react-grab.com/blog/visual-edit",
  },
};

interface VisualEditLayoutProps {
  children: React.ReactNode;
}

const VisualEditLayout = ({ children }: VisualEditLayoutProps) => {
  return children;
};

VisualEditLayout.displayName = "VisualEditLayout";

export default VisualEditLayout;
