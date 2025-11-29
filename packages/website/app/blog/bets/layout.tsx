import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Some Bets",
  description: "Some bets for the future of AI coding and UI development.",
  openGraph: {
    title: "Some Bets",
    description: "Some bets for the future of AI coding and UI development.",
    url: "https://react-grab.com/blog/bets",
    siteName: "React Grab",
    images: [
      {
        url: "https://react-grab.com/banner.png",
        width: 1200,
        height: 630,
        alt: "React Grab - Some Bets",
      },
    ],
    locale: "en_US",
    type: "article",
    authors: ["Aiden Bai"],
    publishedTime: "2025-11-29T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "Some Bets",
    description: "Some bets for the future of AI coding and UI development.",
    images: ["https://react-grab.com/banner.png"],
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
