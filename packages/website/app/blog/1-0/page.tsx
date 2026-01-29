"use client";

import type { ReactNode } from "react";
import { InstallTabs } from "@/components/install-tabs";
import { BenchmarkTooltip } from "@/components/benchmark-tooltip";
import { IconClaude } from "@/components/icons/icon-claude";
import { IconCopilot } from "@/components/icons/icon-copilot";
import { IconCursor } from "@/components/icons/icon-cursor";
import { BlogArticleLayout } from "@/components/blog-article-layout";

const headings = [
  { id: "react-grab-is-now-1-0", text: "React Grab 1.0", level: 3 },
  { id: "install-react-grab", text: "Install React Grab", level: 3 },
];

const authors = [{ name: "Aiden Bai", url: "https://x.com/aidenybai" }];

interface ToolWithIconProps {
  icon: ReactNode;
  name: string;
}

const ToolWithIcon = ({ icon, name }: ToolWithIconProps) => (
  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
    {icon}
    {name}
  </span>
);

ToolWithIcon.displayName = "ToolWithIcon";

const BlogPostPage = () => {
  return (
    <BlogArticleLayout
      title="React Grab 1.0"
      authors={authors}
      date="January 28, 2026"
      headings={headings}
    >
      <div className="flex flex-col gap-4 text-neutral-400">
        <div className="flex flex-col gap-3">
          <p>React Grab 1.0 is finally here.</p>
          <p>
            React Grab lets you select context for coding agents directly from
            your website.
          </p>
          <p>
            It makes tools like{" "}
            <ToolWithIcon
              icon={
                <IconCursor
                  width={16}
                  height={16}
                  className="translate-y-[2px] text-white"
                />
              }
              name="Cursor"
            />
            ,{" "}
            <ToolWithIcon
              icon={
                <IconClaude
                  width={16}
                  height={16}
                  className="translate-y-[2px]"
                />
              }
              name="Claude Code"
            />
            ,{" "}
            <ToolWithIcon
              icon={
                <IconCopilot
                  width={18}
                  height={18}
                  className="translate-y-[2px] text-white"
                />
              }
              name="Copilot"
            />{" "}
            run up to{" "}
            <BenchmarkTooltip
              href="/blog/intro"
              className="shimmer-text-pink inline-block touch-manipulation py-1"
            >
              <span className="font-bold">3×</span>&nbsp;faster
            </BenchmarkTooltip>
            .
          </p>
        </div>

        <InstallTabs />
      </div>
    </BlogArticleLayout>
  );
};

BlogPostPage.displayName = "BlogPostPage";

export default BlogPostPage;
