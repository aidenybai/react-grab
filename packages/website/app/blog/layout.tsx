import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - React Grab",
  description:
    "Read writing and updates about React Grab",
  openGraph: {
    title: "Blog - React Grab",
    description:
      "Read writing and updates about React Grab",
    url: "https://react-grab.com/blog",
    siteName: "React Grab",
    images: [
      {
        url: "https://react-grab.com/banner.png",
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
    title: "Blog - React Grab",
    description:
      "Read writing and updates about React Grab",
    images: ["https://react-grab.com/banner.png"],
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
