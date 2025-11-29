import type { Metadata } from "next";

const title = "I made your coding agent 55% faster at frontend";
const description = "I got tired of watching Claude grep around my codebase every time I wanted to edit a button. So I built a tool that lets me click any element and copy its exact source location. Turns out it makes coding agents 55% faster.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/blog/intro",
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
    publishedTime: "2025-11-24T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
    creator: "@aidenybai",
  },
  alternates: {
    canonical: "https://react-grab.com/blog/intro",
  },
};

interface BlogPostLayoutProps {
  children: React.ReactNode;
}

const BlogPostLayout = ({ children }: BlogPostLayoutProps) => {
  return children;
};

export default BlogPostLayout;
