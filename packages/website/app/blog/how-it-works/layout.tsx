import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
};

interface BlogLayoutProps {
  children: React.ReactNode;
}

const BlogLayout = ({ children }: BlogLayoutProps) => {
  return children;
};

export default BlogLayout;
