"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { TableOfContents } from "@/components/table-of-contents";

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
              <Link
                href="/"
                className="hover:text-white transition-colors flex items-center gap-2 underline underline-offset-4"
              >
                <ArrowLeft size={16} />
                Back to home
              </Link>
              <span>·</span>
              <Link
                href="/blog"
                className="hover:text-white transition-colors underline underline-offset-4"
              >
                Read more posts
              </Link>
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
                    <a
                      href={author.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-300 hover:text-white underline underline-offset-4"
                    >
                      {author.name}
                    </a>
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
