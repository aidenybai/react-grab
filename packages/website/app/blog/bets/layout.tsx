import type { Metadata } from "next";

const title = "Some bets";
const description = "Some bets for the future of AI coding and UI development.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/blog/bets",
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
    authors: ["Aiden Bai"],
    publishedTime: "2025-11-29T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
    creator: "@aidenybai",
  },
  alternates: {
    canonical: "https://react-grab.com/blog/bets",
  },
};

interface BetsLayoutProps {
  children: React.ReactNode;
}

const BetsLayout = ({ children }: BetsLayoutProps) => {
  return children;
};

BetsLayout.displayName = "BetsLayout";

export default BetsLayout;
