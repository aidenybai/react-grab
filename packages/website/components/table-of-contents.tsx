"use client";

import { useEffect, useState } from "react";

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
                  className={`block text-sm border-l-2 pl-3 -ml-0.5 ${indentClass} ${
                    isActive
                      ? "text-neutral-200 border-[#ff4fff]"
                      : "text-neutral-500 border-transparent hover:text-neutral-300 hover:border-neutral-700"
                  }`}
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
