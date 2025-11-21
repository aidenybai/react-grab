import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "I made your coding agent 55% faster at frontend",
  description: "I got tired of watching Claude grep around my codebase every time I wanted to edit a button. So I built a tool that lets me click any element and copy its exact source location. Turns out it makes coding agents 55% faster.",
};

interface BlogPostLayoutProps {
  children: React.ReactNode;
}

const BlogPostLayout = ({ children }: BlogPostLayoutProps) => {
  return children;
};

export default BlogPostLayout;
