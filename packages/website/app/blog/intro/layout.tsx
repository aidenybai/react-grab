import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "I made your coding agent 55% faster at frontend",
};

interface BlogPostLayoutProps {
  children: React.ReactNode;
}

const BlogPostLayout = ({ children }: BlogPostLayoutProps) => {
  return children;
};

export default BlogPostLayout;
