import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "I made your coding agent 55% faster at frontend",
  description: "I got tired of watching Claude grep around my codebase every time I wanted to edit a button. So I built a tool that lets me click any element and copy its exact source location. Turns out it makes coding agents 55% faster.",
  openGraph: {
    title: "I made your coding agent 55% faster at frontend",
    description: "I got tired of watching Claude grep around my codebase every time I wanted to edit a button. So I built a tool that lets me click any element and copy its exact source location. Turns out it makes coding agents 55% faster.",
    url: "https://react-grab.com/blog/intro",
    siteName: "React Grab",
    images: [
      {
        url: "https://react-grab.com/banner.png",
        width: 1200,
        height: 630,
        alt: "React Grab - I made your coding agent 55% faster at frontend",
      },
    ],
    locale: "en_US",
    type: "article",
    authors: ["Aiden Bai"],
    publishedTime: "2025-11-24T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "I made your coding agent 55% faster at frontend",
    description: "I got tired of watching Claude grep around my codebase every time I wanted to edit a button. So I built a tool that lets me click any element and copy its exact source location. Turns out it makes coding agents 55% faster.",
    images: ["https://react-grab.com/banner.png"],
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
