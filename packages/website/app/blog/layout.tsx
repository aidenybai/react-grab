import type { Metadata } from "next";

const title = "Blog";
const description = "Read writing and updates about React Grab";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} - React Grab`,
  description,
  openGraph: {
    title: `${title} - React Grab`,
    description,
    url: "https://react-grab.com/blog",
    siteName: "React Grab",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "React Grab Blog",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - React Grab`,
    description,
    images: [ogImageUrl],
  },
};

interface BlogLayoutProps {
  children: React.ReactNode;
}

const BlogLayout = ({ children }: BlogLayoutProps) => {
  return children;
};

BlogLayout.displayName = "BlogLayout";

export default BlogLayout;
