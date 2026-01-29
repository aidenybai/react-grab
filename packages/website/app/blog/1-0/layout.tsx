import type { Metadata } from "next";

const title = "React Grab 1.0";
const description =
  "React Grab 1.0 is here. Select context for coding agents directly from your website & make tools like Cursor, Claude Code, Copilot run up to 3× faster.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/blog/1-0",
    siteName: "React Grab",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${title}`,
      },
    ],
    locale: "en_US",
    type: "article",
    authors: ["Aiden Bai"],
    publishedTime: "2026-01-28T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
    creator: "@aidenybai",
  },
  alternates: {
    canonical: "https://react-grab.com/blog/1-0",
  },
};

interface BlogPostLayoutProps {
  children: React.ReactNode;
}

const BlogPostLayout = ({ children }: BlogPostLayoutProps) => {
  return children;
};

BlogPostLayout.displayName = "BlogPostLayout";

export default BlogPostLayout;
