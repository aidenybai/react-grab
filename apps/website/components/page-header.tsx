import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { GithubLink } from "@/components/github-link";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
}

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <header className="flex flex-col gap-1.5">
    <Link
      href="/"
      className="mb-3 inline-flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-faint transition-colors hover:text-prose"
    >
      <ArrowLeft size={13} />
      React Grab
    </Link>
    <div className="flex items-center justify-between">
      <h1 className="font-page-title text-h2 font-medium tracking-tight text-title">{title}</h1>
      <GithubLink />
    </div>
    {subtitle && <p className="text-prose">{subtitle}</p>}
  </header>
);

PageHeader.displayName = "PageHeader";
