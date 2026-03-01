"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { TableOfContents } from "@/components/table-of-contents";
import { Button } from "@/components/ui/button";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface Author {
  name: string;
  url: string;
}

interface BlogArticleLayoutProps {
  title: string;
  authors: Author[];
  date: string;
  headings: TocHeading[];
  children: React.ReactNode;
  subtitle?: React.ReactNode;
}

export const BlogArticleLayout = ({
  title,
  authors,
  date,
  headings,
  children,
  subtitle,
}: BlogArticleLayoutProps) => {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="px-4 sm:px-8 pt-12 sm:pt-16 pb-56">
        <div className="mx-auto max-w-5xl flex justify-center gap-12">
          <TableOfContents headings={headings} />

          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm text-neutral-400 opacity-50 hover:opacity-100 transition-opacity">
              <Button
                asChild
                variant="link"
                size="sm"
                className="h-auto px-0 py-0 text-sm text-neutral-400 hover:text-white"
              >
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft size={16} />
                  Back to home
                </Link>
              </Button>
              <span>·</span>
              <Button
                asChild
                variant="link"
                size="sm"
                className="h-auto px-0 py-0 text-sm text-neutral-400 hover:text-white"
              >
                <Link href="/blog">Read more posts</Link>
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <Image
                    src={ReactGrabLogo}
                    alt="React Grab"
                    className="w-10 h-10"
                  />
                </Link>
                <h1 className="text-xl font-medium text-white">{title}</h1>
              </div>

              <div className="text-sm text-neutral-500">
                By{" "}
                {authors.map((author, index) => (
                  <span key={author.name}>
                    <Link
                      href={author.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm text-neutral-300 underline underline-offset-4 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      {author.name}
                    </Link>
                    {index < authors.length - 1 && ", "}
                  </span>
                ))}
                {" · "}
                <span>{date}</span>
              </div>
              {subtitle}
            </div>

            {children}
          </div>

          <div className="hidden lg:block w-48 shrink-0" />
        </div>
      </div>
    </div>
  );
};

BlogArticleLayout.displayName = "BlogArticleLayout";
