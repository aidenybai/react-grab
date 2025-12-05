"use client";

import { useRef, useState, useEffect } from "react";

interface ScrollableProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const Scrollable = ({
  children,
  className = "",
  maxHeight = "200px",
}: ScrollableProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);
  const [scrollbarTop, setScrollbarTop] = useState(0);

  useEffect(() => {
    const updateScrollbar = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const hasScroll = element.scrollHeight > element.clientHeight;
      setShowScrollbar(hasScroll);

      if (hasScroll) {
        const scrollRatio = element.clientHeight / element.scrollHeight;
        const newScrollbarHeight = Math.max(
          element.clientHeight * scrollRatio,
          20,
        );
        setScrollbarHeight(newScrollbarHeight);

        const scrollPercentage =
          element.scrollTop / (element.scrollHeight - element.clientHeight);
        const maxScrollbarTop = element.clientHeight - newScrollbarHeight;
        setScrollbarTop(scrollPercentage * maxScrollbarTop);
      }
    };

    const element = contentRef.current;
    if (!element) return;

    updateScrollbar();
    element.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);

    return () => {
      element.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [children]);

  const handleScrollbarMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startScrollTop = contentRef.current?.scrollTop || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!contentRef.current) return;

      const deltaY = moveEvent.clientY - startY;
      const scrollRatio =
        contentRef.current.scrollHeight / contentRef.current.clientHeight;
      contentRef.current.scrollTop = startScrollTop + deltaY * scrollRatio;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={contentRef}
        className={`overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        style={{ maxHeight }}
      >
        {children}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-linear-to-t from-black/50 to-transparent" />
      {showScrollbar && (
        <div
          className={`absolute right-0 top-0 w-1 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{ height: maxHeight }}
        >
          <div
            ref={scrollbarRef}
            className="absolute right-0 w-1 bg-[#3a3a3a] cursor-pointer hover:bg-[#4a4a4a] transition-colors"
            style={{
              height: `${scrollbarHeight}px`,
              top: `${scrollbarTop}px`,
            }}
            onMouseDown={handleScrollbarMouseDown}
          />
        </div>
      )}
    </div>
  );
};

Scrollable.displayName = "Scrollable";
