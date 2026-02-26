"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { Button } from "@/components/ui/button";

interface BlogPost {
  slug: string;
  title: string;
  year: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: "1-0",
    title: "React Grab Is Now 1.0",
    year: "2026",
  },
  {
    slug: "agent",
    title: "React Grab for Agents",
    year: "2025",
  },
  {
    slug: "bets",
    title: "Some bets",
    year: "2025",
  },
  {
    slug: "intro",
    title: "I made your coding agent 3× faster at frontend",
    year: "2025",
  },
];

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8">
        <Button
          asChild
          variant="link"
          size="sm"
          className="mb-4 h-auto px-0 py-0 text-sm text-neutral-400 opacity-50 hover:text-white hover:opacity-100"
        >
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </Button>

        <div className="inline-flex" style={{ padding: "2px" }}>
          <Link href="/" className="rounded-sm transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
            <Image
              src={ReactGrabLogo}
              alt="React Grab"
              width={42}
              height={42}
              className="logo-shimmer-once"
            />
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-white font-bold">Blog</div>
          <div className="text-sm text-neutral-500">
            Posts from the React Grab team
          </div>
        </div>

        <div className="flex flex-col mt-8">
          {blogPosts.map((post, index) => {
            const showYear =
              index === 0 || blogPosts[index - 1].year !== post.year;

            return (
              <div key={post.slug}>
                {showYear && (
                  <div className="text-neutral-500 text-sm tabular-nums pt-2 pb-1 sm:hidden">
                    {post.year}
                  </div>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid grid-cols-[1fr] rounded-lg py-2 transition-colors hover:bg-[#0f0f0f] focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:-mx-3 sm:grid-cols-[80px_1fr] sm:gap-8 sm:px-3 sm:py-3"
                >
                  <span className="hidden sm:block text-neutral-500 text-base tabular-nums">
                    {showYear ? post.year : ""}
                  </span>
                  <span className="text-white group-hover:text-neutral-200 transition-colors text-sm sm:text-base">
                    {post.title}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

BlogPage.displayName = "BlogPage";

export default BlogPage;
