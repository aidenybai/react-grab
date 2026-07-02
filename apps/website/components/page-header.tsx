import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
    <h1 className="text-h2 font-medium text-title">{title}</h1>
    {subtitle && <p className="text-prose">{subtitle}</p>}
  </header>
);

PageHeader.displayName = "PageHeader";
