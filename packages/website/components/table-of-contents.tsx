"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TocHeading[];
}

export const TableOfContents = ({ headings }: TableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-96px 0px -80% 0px",
        threshold: 0,
      },
    );

    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean) as HTMLElement[];

    for (const element of headingElements) {
      observer.observe(element);
    }

    return () => {
      for (const element of headingElements) {
        observer.unobserve(element);
      }
    };
  }, [headings]);

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveId(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="hidden lg:block w-48 shrink-0">
      <div className="sticky top-24 bg-black py-4 -my-4 px-2 -mx-2 rounded-lg opacity-50 hover:opacity-100 transition-opacity">
        <div className="text-sm font-medium text-neutral-300 mb-4">
          On this page
        </div>
        <ul className="flex flex-col gap-2">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const indentClass = heading.level === 4 ? "pl-3" : "";

            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(event) => handleClick(event, heading.id)}
                  className={cn(
                    "block rounded-sm border-l-2 -ml-0.5 pl-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    indentClass,
                    isActive
                      ? "border-[#ff4fff] text-neutral-200"
                      : "border-transparent text-neutral-500 hover:border-neutral-700 hover:text-neutral-300",
                  )}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

TableOfContents.displayName = "TableOfContents";
