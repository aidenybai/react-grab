"use client";

import * as React from "react";

interface NavigationMenuProps {
  className?: string;
  children: React.ReactNode;
}

export function NavigationMenu({ className, children }: NavigationMenuProps) {
  return (
    <nav
      className={`relative z-10 flex max-w-max flex-1 items-center justify-center ${className ?? ""}`}
    >
      {children}
    </nav>
  );
}

export function NavigationMenuList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={`group flex flex-1 list-none items-center justify-center space-x-1 ${className ?? ""}`}
    >
      {children}
    </ul>
  );
}

export function NavigationMenuItem({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <li className={className}>{children}</li>;
}

export function NavigationMenuTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <button
      className={`group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none ${className ?? ""}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      aria-expanded={isOpen}
    >
      {children}
      <svg
        className={`relative top-[1px] ml-1 h-3 w-3 transition duration-200 ${isOpen ? "rotate-180" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function NavigationMenuContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute left-0 top-full w-full md:w-auto ${className ?? ""}`}
    >
      <div className="rounded-md border bg-white p-4 shadow-lg">{children}</div>
    </div>
  );
}

export function NavigationMenuLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 ${className ?? ""}`}
    >
      {children}
    </a>
  );
}
